import { liveQuery } from 'dexie';
import { db } from '@/data/db';
import { latestOccurrenceAtOrBefore, nextOccurrenceAfter } from '@/domain/recurrence';
import { REMINDER_FIRED_EVENT } from '@/domain/types';
import type { NotificationService, ReminderEvent, ReminderFiredDetail } from '@/domain/types';
import { runAsLeader } from './leader';
import { getPermission, requestPermission } from './permission';
import { registerServiceWorker, showSystemNotification } from './register-sw';

/** Au-delà de ce retard, une occurrence n'est plus notifiée mais journalisée "manquée" (AMB-03). */
export const LATE_GRACE_MS = 5 * 60_000;
/** Contrôle de sécurité périodique (veille, throttling des onglets cachés). */
export const SAFETY_TICK_MS = 30_000;

export interface FiredItem {
  event: ReminderEvent;
  note?: string;
}
export interface ProcessResult {
  fired: FiredItem[];
  missed: ReminderEvent[];
}

/**
 * Traite toutes les échéances échues à l'instant `now` (horloge injectable pour les tests).
 * Pour chaque rappel échu : seule l'occurrence la plus récente <= now est considérée ;
 * retard <= LATE_GRACE_MS => 'fired', sinon 'missed'. `nextDueAt` saute à la prochaine occurrence future (ou null).
 * Anti-doublon : l'insertion de `ReminderEvent` (clé `${reminderId}:${dueAt}`) est atomique ; si la clé existe,
 * un autre onglet a déjà traité l'occurrence et rien n'est retourné pour elle.
 * L'affichage n'est PAS fait ici (la fonction ne touche que la base).
 */
export async function processDueReminders(now: number = Date.now()): Promise<ProcessResult> {
  const result: ProcessResult = { fired: [], missed: [] };
  const dueIds = await db.reminders.where('nextDueAt').belowOrEqual(now).primaryKeys();
  for (const id of dueIds) {
    await db.transaction('rw', db.reminders, db.reminderEvents, async () => {
      const r = await db.reminders.get(id);
      if (!r || r.nextDueAt === null || r.nextDueAt > now) return; // modifié / traité entre-temps
      const dueAt = latestOccurrenceAtOrBefore(r, now) ?? r.nextDueAt;
      const status = now - dueAt <= LATE_GRACE_MS ? 'fired' : 'missed';
      const event: ReminderEvent = {
        id: `${r.id}:${dueAt}`,
        reminderId: r.id,
        title: r.title,
        dueAt,
        status,
        handledAt: now,
        acknowledged: false,
      };
      const nextDueAt = nextOccurrenceAfter(r, now);
      await db.reminders.update(r.id, { nextDueAt });
      if (await db.reminderEvents.get(event.id)) return; // déjà traité ailleurs
      await db.reminderEvents.add(event);
      if (status === 'fired') result.fired.push({ event, note: r.note });
      else result.missed.push(event);
    });
  }
  return result;
}

/** Prochaine échéance (epoch ms) toutes tables confondues, ou null. */
export async function nextDueTimestamp(): Promise<number | null> {
  const first = await db.reminders.orderBy('nextDueAt').first(); // les null ne sont pas indexés
  return first?.nextDueAt ?? null;
}

/** Délai avant le prochain contrôle : prochaine échéance, plafonné au contrôle de sécurité. */
export function nextDelay(nextDue: number | null, now: number): number {
  if (nextDue === null) return SAFETY_TICK_MS;
  return Math.min(SAFETY_TICK_MS, Math.max(0, nextDue - now));
}

function announce(item: FiredItem): void {
  const { event, note } = item;
  const detail: ReminderFiredDetail = {
    eventId: event.id,
    reminderId: event.reminderId,
    title: event.title,
    dueAt: event.dueAt,
  };
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(REMINDER_FIRED_EVENT, { detail }));
  void showSystemNotification(event.title, note, event.id);
}

/** Boucle du scheduler dans l'onglet leader. Retourne la fonction d'arrêt. */
export function startSchedulerLoop(now: () => number = Date.now): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let busy = false;
  let again = false;

  const arm = async () => {
    if (stopped) return;
    clearTimeout(timer);
    const delay = nextDelay(await nextDueTimestamp().catch(() => null), now());
    if (stopped) return;
    timer = setTimeout(() => void tick(), delay);
  };

  const tick = async () => {
    if (stopped) return;
    if (busy) {
      again = true;
      return;
    }
    busy = true;
    try {
      do {
        again = false;
        const res = await processDueReminders(now());
        res.fired.forEach(announce);
      } while (again && !stopped);
    } catch {
      // erreur transitoire de base : le prochain contrôle réessaie
    } finally {
      busy = false;
    }
    await arm();
  };

  const onWake = () => void tick();
  window.addEventListener('focus', onWake);
  window.addEventListener('online', onWake);
  document.addEventListener('visibilitychange', onWake);
  // Modification d'un rappel (ici ou dans un autre onglet) : ré-évalue l'échéance suivante (CA-R2.3).
  const sub = liveQuery(() => nextDueTimestamp()).subscribe({ next: onWake, error: () => undefined });

  void tick();
  return () => {
    stopped = true;
    clearTimeout(timer);
    window.removeEventListener('focus', onWake);
    window.removeEventListener('online', onWake);
    document.removeEventListener('visibilitychange', onWake);
    sub.unsubscribe();
  };
}

let stopLeader: (() => void) | undefined;

export const notificationService: NotificationService = {
  permission: getPermission,
  requestPermission,
  start() {
    if (stopLeader || typeof window === 'undefined') return; // idempotent (React strict mode)
    void registerServiceWorker();
    stopLeader = runAsLeader(() => startSchedulerLoop());
  },
  stop() {
    stopLeader?.();
    stopLeader = undefined;
  },
};
