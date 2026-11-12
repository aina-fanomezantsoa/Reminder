import { db, newId } from '../db';
import { reminderInputSchema, validate } from '@/domain/schemas';
import { toEpochMs } from '@/domain/dates';
import { nextOccurrenceAfter, occurrencesBetween as ruleOccurrences } from '@/domain/recurrence';
import type {
  ID,
  LocalDate,
  Reminder,
  ReminderInput,
  ReminderOccurrence,
  ReminderService,
  Result,
} from '@/domain/types';

const PAST_MSG = 'La date et l\'heure doivent être dans le futur.';

/** `now` injectable pour les tests (horloge simulée). */
type Clock = () => number;

async function save(id: ID | null, input: ReminderInput, now: number): Promise<Result<Reminder, ReminderInput>> {
  const v = validate(reminderInputSchema, input);
  if (!v.ok) return v;
  const d = v.value;
  return db.transaction('rw', db.reminders, db.tasks, async () => {
    if (d.taskId && !(await db.tasks.get(d.taskId))) {
      return { ok: false as const, errors: { taskId: 'Tâche introuvable.' } };
    }
    const existing = id ? await db.reminders.get(id) : undefined;
    if (id && !existing) return { ok: false as const, errors: { title: 'Rappel introuvable.' } };

    const rule = { startDate: d.startDate, time: d.time, recurrence: d.recurrence };
    const sameRule =
      !!existing &&
      existing.startDate === d.startDate &&
      existing.time === d.time &&
      existing.recurrence === d.recurrence;

    // AMB-04 : date/heure passée refusée à la création et quand l'ancre est modifiée.
    // Modifier seulement titre/note/tâche d'une série dont l'ancre est passée reste permis.
    const anchorChanged = !existing || existing.startDate !== d.startDate || existing.time !== d.time;
    // Série récurrente existante : seule la prochaine occurrence calculée doit être future (garanti
    // par nextOccurrenceAfter), donc une ancre passée est acceptée.
    const startedSeries = !!existing && d.recurrence !== 'none';
    if (anchorChanged && !startedSeries && toEpochMs(d.startDate, d.time) <= now) {
      return { ok: false as const, errors: { startDate: PAST_MSG } };
    }

    // Règle inchangée : on conserve l'échéance en cours (peut être légèrement échue, le scheduler la traitera).
    const nextDueAt = sameRule ? existing.nextDueAt : nextOccurrenceAfter(rule, now);

    const reminder: Reminder = {
      id: existing?.id ?? newId(),
      title: d.title,
      startDate: d.startDate,
      time: d.time,
      recurrence: d.recurrence,
      nextDueAt,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    if (d.note !== undefined && d.note.trim() !== '') reminder.note = d.note;
    if (d.taskId) reminder.taskId = d.taskId;
    await db.reminders.put(reminder);
    return { ok: true as const, value: reminder };
  });
}

export function createReminderService(clock: Clock = Date.now): ReminderService & {
  get(id: ID): Promise<Reminder | undefined>;
  list(): Promise<Reminder[]>;
} {
  return {
    get: (id) => db.reminders.get(id),
    list: () => db.reminders.toArray(),

    create: (input) => save(null, input, clock()),
    update: (id, input) => save(id, input, clock()),

    /** Supprime la série entière. Les événements (journal) sont conservés : leur titre est copié. */
    async remove(id) {
      await db.reminders.delete(id);
    },

    async occurrencesBetween(from: LocalDate, to: LocalDate): Promise<ReminderOccurrence[]> {
      const all = await db.reminders.toArray();
      const out: ReminderOccurrence[] = [];
      for (const r of all) {
        for (const at of ruleOccurrences(r, from, to)) {
          out.push({ reminderId: r.id, title: r.title, at, recurring: r.recurrence !== 'none' });
        }
      }
      return out.sort((a, b) => a.at - b.at);
    },

    async acknowledgeMissed(eventId) {
      await db.reminderEvents.update(eventId, { acknowledged: true });
    },
  };
}

export const reminderService = createReminderService();
