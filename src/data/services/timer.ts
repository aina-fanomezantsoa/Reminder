import { db, newId } from '../db';
import { addDaysLocal, parseLocalDate } from '@/domain/dates';
import type { ID, LocalDate, Result } from '@/domain/types';

/** État « tâche en pause » : une ligne dans la table settings (persiste au rechargement, inclus dans les sauvegardes). */
const PAUSED_KEY = 'pausedTaskId';

const closeOpen = (now: number) => db.timeSessions.filter((s) => s.end === undefined).modify({ end: now });

export const timerService = {
  async getPausedTaskId(): Promise<ID | null> {
    const v = (await db.settings.get(PAUSED_KEY))?.value;
    return typeof v === 'string' ? v : null;
  },

  async start(taskId: ID): Promise<Result<{ id: ID }, { taskId: ID }>> {
    return db.transaction('rw', db.tasks, db.timeSessions, db.settings, async () => {
      const task = await db.tasks.get(taskId);
      if (!task) return { ok: false as const, errors: { taskId: 'Tâche introuvable.' } };
      if (task.status === 'done') return { ok: false as const, errors: { taskId: 'La tâche est terminée.' } };
      const now = Date.now();
      await closeOpen(now);
      const id = newId();
      await db.timeSessions.add({ id, taskId, start: now });
      await db.settings.delete(PAUSED_KEY);
      return { ok: true as const, value: { id } };
    });
  },

  async pause(): Promise<void> {
    await db.transaction('rw', db.timeSessions, db.settings, async () => {
      const open = await db.timeSessions.filter((s) => s.end === undefined).first();
      if (!open) return;
      await closeOpen(Date.now());
      await db.settings.put({ key: PAUSED_KEY, value: open.taskId });
    });
  },

  async stop(): Promise<void> {
    await db.transaction('rw', db.timeSessions, db.settings, async () => {
      await closeOpen(Date.now());
      await db.settings.delete(PAUSED_KEY);
    });
  },

  /** Supprime la part du jour `date` des sessions de la tâche (rogne celles qui chevauchent minuit). */
  async resetDay(taskId: ID, date: LocalDate): Promise<void> {
    const dayStart = parseLocalDate(date).getTime();
    const dayEnd = parseLocalDate(addDaysLocal(date, 1)).getTime();
    await db.transaction('rw', db.timeSessions, async () => {
      const now = Date.now();
      const rows = await db.timeSessions.where('taskId').equals(taskId).toArray();
      for (const s of rows) {
        const end = s.end ?? now;
        if (end <= dayStart || s.start >= dayEnd) continue;
        const before = s.start < dayStart;
        const after = end > dayEnd;
        if (s.end === undefined && !after) {
          // chrono en cours : on retire la part passée du jour mais il continue de tourner
          if (before) await db.timeSessions.add({ id: newId(), taskId, start: now });
          if (before) await db.timeSessions.update(s.id, { end: dayStart });
          else await db.timeSessions.update(s.id, { start: now });
        } else if (!before && !after) await db.timeSessions.delete(s.id);
        else if (before && !after) await db.timeSessions.update(s.id, { end: dayStart });
        else if (!before && after) await db.timeSessions.update(s.id, { start: dayEnd });
        else {
          // couvre tout le jour : on garde les deux parts
          await db.timeSessions.update(s.id, { end: dayStart });
          await db.timeSessions.add({ id: newId(), taskId, start: dayEnd, end: s.end });
        }
      }
    });
  },
};
