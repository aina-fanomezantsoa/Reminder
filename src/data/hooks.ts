'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import {
  loadCalendarEntries,
  loadReminderLists,
  loadTask,
  loadTaskBoard,
  loadTaskComments,
  loadTaskReminders,
  loadTasks,
  type ReminderLists,
} from './queries';
import { timerService } from './services/timer';
import { DEFAULT_PROFILE, settingsService, type NotificationPromptState } from './services/settings';
import { completedPerDay, computeRings } from '@/domain/stats';
import { addDaysLocal, parseLocalDate, todayLocal } from '@/domain/dates';
import { getPermission, subscribePermission } from '@/notifications/permission';
import type {
  BarDatum,
  ID,
  LocalDate,
  PermissionState,
  Profile,
  Reminder,
  ReminderOccurrence,
  RingMetric,
  Task,
  TaskBoard,
  TaskCardData,
  TaskComment,
  TimeSession,
} from '@/domain/types';

/**
 * Hooks réactifs (liveQuery, y compris entre onglets). Convention : `undefined` pendant le chargement initial.
 */

/** Dashboard. `ringsLimit` : 4 (panneau droit), 8 (page Tableau de bord). `totalTasks` : "Voir toutes les tâches (n)". */
export function useDashboard(
  ringsLimit = 4,
): { rings: RingMetric[]; completed: BarDatum[]; totalTasks: number } | undefined {
  return useLiveQuery(async () => {
    const tasks = await db.tasks.toArray();
    return {
      rings: computeRings(tasks, ringsLimit),
      completed: completedPerDay(tasks, 7, todayLocal()),
      totalTasks: tasks.length,
    };
  }, [ringsLimit]);
}

// ---------- Tâches ----------

/** Kanban : colonnes par statut, cartes triées par position, avec sous-tâches et compteurs. */
export function useTaskBoard(): TaskBoard | undefined {
  return useLiveQuery(loadTaskBoard, []);
}

/** Toutes les tâches (Gantt, listes de choix), triées par date de début. */
export function useTasks(): Task[] | undefined {
  return useLiveQuery(loadTasks, []);
}

/** Une tâche avec sous-tâches et compteurs ; `null` si inexistante ; `undefined` pendant le chargement. */
export function useTask(id: ID | undefined): TaskCardData | null | undefined {
  return useLiveQuery(() => (id ? loadTask(id) : null), [id]);
}

export function useTaskComments(taskId: ID | undefined): TaskComment[] | undefined {
  return useLiveQuery(() => (taskId ? loadTaskComments(taskId) : []), [taskId]);
}

/** Rappels liés à une tâche (fiche tâche). */
export function useTaskReminders(taskId: ID | undefined): Reminder[] | undefined {
  return useLiveQuery(() => (taskId ? loadTaskReminders(taskId) : []), [taskId]);
}

// ---------- Rappels ----------

/** `missed` = occurrences manquées non acquittées (bandeau). */
export function useReminders(): ReminderLists | undefined {
  return useLiveQuery(loadReminderLists, []);
}

/**
 * Calendrier mensuel. `monthStart` : n'importe quel jour du mois ('YYYY-MM-DD'), normalisé au 1er.
 * Les entrées couvrent la grille complète de 6 semaines lundi-dimanche (jours des mois voisins inclus).
 */
export function useCalendarEntries(
  monthStart: LocalDate,
): { tasks: Task[]; reminders: ReminderOccurrence[] } | undefined {
  return useLiveQuery(() => loadCalendarEntries(monthStart), [monthStart]);
}

// ---------- Plan du jour / profil ----------

/** Sessions touchant le jour `date` (y compris celles commencées la veille ou encore ouvertes). */
export function useDaySessions(date: LocalDate): TimeSession[] | undefined {
  return useLiveQuery(async () => {
    const dayStart = parseLocalDate(date).getTime();
    const dayEnd = parseLocalDate(addDaysLocal(date, 1)).getTime(); // exclu
    const from = parseLocalDate(addDaysLocal(date, -1)).getTime();
    const rows = await db.timeSessions.where('start').between(from, dayEnd, true, false).toArray();
    const open = await db.timeSessions.filter((s) => s.end === undefined && s.start < from).toArray();
    return [...open, ...rows]
      .filter((s) => s.end === undefined || s.end > dayStart)
      .sort((a, b) => a.start - b.start);
  }, [date]);
}

/** Session en cours (chrono qui tourne), `null` si aucune, `undefined` pendant le chargement. */
export function useActiveSession(): TimeSession | null | undefined {
  return useLiveQuery(async () => (await db.timeSessions.filter((s) => s.end === undefined).first()) ?? null, []);
}

/** Temps cumulé (ms) par tâche ; les sessions ouvertes comptent jusqu'à l'instant de la requête (ajouter l'écart via useNow si besoin). */
export function useTaskTotals(): Map<ID, number> | undefined {
  return useLiveQuery(async () => {
    const now = Date.now();
    const m = new Map<ID, number>();
    for (const s of await db.timeSessions.toArray()) {
      m.set(s.taskId, (m.get(s.taskId) ?? 0) + Math.max(0, (s.end ?? now) - s.start));
    }
    return m;
  }, []);
}

/** Tâche en pause (reprise possible), `null` si aucune. */
export function usePausedTaskId(): ID | null | undefined {
  return useLiveQuery(() => timerService.getPausedTaskId(), []);
}

/** `Date.now()` rafraîchi chaque seconde, uniquement si `active`. */
export function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- rafraîchit « now » dès l'activation
    setNow(Date.now());
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, [active]);
  return now;
}

/** Profil ; valeur par défaut tant que rien n'est enregistré. `undefined` pendant le chargement. */
export function useProfile(): Profile | undefined {
  return useLiveQuery(() => settingsService.getProfile(), []);
}
export { DEFAULT_PROFILE };

/** État de l'invite de notification (CA-R5.1). */
export function useNotificationPromptState(): NotificationPromptState | undefined {
  return useLiveQuery(() => settingsService.getNotificationPromptState(), []);
}

// ---------- Notifications ----------

/** Permission de notification, mise à jour après requestPermission, au retour sur l'onglet et si l'utilisateur change le réglage. */
export function useNotificationPermission(): PermissionState {
  return useSyncExternalStore(subscribePermission, getPermission, () => 'default' as PermissionState);
}

/** Sessions de chrono d'une tâche (pour un total en direct via `totalMs(sessions, now)`). */
export function useTaskSessions(taskId: ID): TimeSession[] | undefined {
  return useLiveQuery(() => db.timeSessions.where('taskId').equals(taskId).toArray(), [taskId]);
}
