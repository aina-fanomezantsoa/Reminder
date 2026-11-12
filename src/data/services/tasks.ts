import { db, newId } from '../db';
import { commentSchema, subtaskTitleSchema, taskInputSchema, taskPatchSchema, validate } from '@/domain/schemas';
import { applyTaskRules, positionBetween, statusFromSubtasks, subtaskProgress } from '@/domain/task-rules';
import type { ID, Reminder, Subtask, Task, TaskComment, TaskInput, TaskService, TaskStatus } from '@/domain/types';

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;

async function column(status: TaskStatus): Promise<Task[]> {
  const rows = await db.tasks.where('[status+position]').between([status, -Infinity], [status, Infinity]).toArray();
  return rows.sort(byPosition);
}

/** Recalcule la progression d'une tâche depuis ses sous-tâches (à appeler dans une transaction tasks+subtasks). Une tâche « done » reste à 100. */
async function syncProgress(taskId: ID): Promise<TaskStatus | null> {
  const t = await db.tasks.get(taskId);
  if (!t) return null;
  const subs = await db.subtasks.where('taskId').equals(taskId).toArray();
  if (subs.length === 0) return null;
  const progress = subtaskProgress(subs);
  if (progress !== t.progress) await db.tasks.update(taskId, { progress, updatedAt: Date.now() });
  const target = statusFromSubtasks(subs);
  return target && target !== t.status ? target : null;
}

/** Après un changement de sous-tâche : met à jour la progression puis déplace la carte dans la colonne imposée. */
async function applySubtaskRules(taskId: ID): Promise<void> {
  const target = await db.transaction('rw', db.tasks, db.subtasks, () => syncProgress(taskId));
  if (target) await taskService.move(taskId, target);
}

/** Clôt la session ouverte de la tâche (à appeler dans une transaction incluant timeSessions). */
async function closeOpenSession(taskId: ID, now: number): Promise<void> {
  await db.timeSessions
    .where('taskId')
    .equals(taskId)
    .filter((s) => s.end === undefined)
    .modify({ end: now });
  if ((await db.settings.get('pausedTaskId'))?.value === taskId) await db.settings.delete('pausedTaskId');
}

async function renumber(status: TaskStatus): Promise<void> {
  const col = await column(status);
  await Promise.all(col.map((t, i) => db.tasks.update(t.id, { position: i + 1 })));
}

export const taskService: TaskService & {
  get(id: ID): Promise<Task | undefined>;
  list(): Promise<Task[]>;
  subtasksOf(taskId: ID): Promise<Subtask[]>;
  commentsOf(taskId: ID): Promise<TaskComment[]>;
} = {
  async get(id) {
    return db.tasks.get(id);
  },
  async list() {
    return db.tasks.toArray();
  },
  async subtasksOf(taskId) {
    return (await db.subtasks.where('taskId').equals(taskId).toArray()).sort(byPosition);
  },
  async commentsOf(taskId) {
    return (await db.comments.where('taskId').equals(taskId).toArray()).sort((a, b) => a.createdAt - b.createdAt);
  },

  async create(input) {
    const v = validate(taskInputSchema, input);
    if (!v.ok) return v;
    return db.transaction('rw', db.tasks, async () => {
      const now = Date.now();
      const d = v.value;
      const status: TaskStatus = d.status ?? 'draft';
      const col = await column(status);
      const base: Task = {
        id: newId(),
        title: d.title,
        status,
        progress: d.progress ?? 0,
        starred: d.starred ?? false,
        startDate: d.startDate,
        endDate: d.endDate,
        position: (col.length ? col[col.length - 1].position : 0) + 1,
        createdAt: now,
        updatedAt: now,
      };
      const task = applyTaskRules(null, base, now);
      await db.tasks.add(task);
      return { ok: true as const, value: task };
    });
  },

  async update(id, patch) {
    const p = validate(taskPatchSchema, patch);
    if (!p.ok) return p;
    return db.transaction('rw', db.tasks, db.timeSessions, db.settings, async () => {
      const current = await db.tasks.get(id);
      if (!current) return { ok: false as const, errors: { title: 'Tâche introuvable.' } };
      const merged: TaskInput = {
        title: current.title,
        startDate: current.startDate,
        endDate: current.endDate,
        ...p.value,
      };
      const full = validate(taskInputSchema, merged);
      if (!full.ok) return full;
      const now = Date.now();
      const statusChanged = p.value.status !== undefined && p.value.status !== current.status;
      let next: Task = {
        ...current,
        title: full.value.title,
        startDate: full.value.startDate,
        endDate: full.value.endDate,
        status: p.value.status ?? current.status,
        progress: p.value.progress ?? current.progress,
        starred: p.value.starred ?? current.starred,
        updatedAt: now,
      };
      next = applyTaskRules(current, next, now);
      if (statusChanged) {
        const col = await column(next.status);
        next.position = (col.length ? col[col.length - 1].position : 0) + 1;
      }
      await db.tasks.put(next);
      if (next.status === 'done') await closeOpenSession(id, now);
      return { ok: true as const, value: next };
    });
  },

  async remove(id) {
    await db.transaction('rw', [db.tasks, db.subtasks, db.comments, db.reminders, db.timeSessions, db.settings], async () => {
      await db.subtasks.where('taskId').equals(id).delete();
      await db.comments.where('taskId').equals(id).delete();
      await db.reminders
        .where('taskId')
        .equals(id)
        .modify((r: Reminder) => {
          delete r.taskId;
        });
      await db.timeSessions.where('taskId').equals(id).delete();
      if ((await db.settings.get('pausedTaskId'))?.value === id) await db.settings.delete('pausedTaskId');
      await db.tasks.delete(id);
    });
  },

  async remindersOf(taskId) {
    return db.reminders.where('taskId').equals(taskId).toArray();
  },

  async move(id, status, beforeId) {
    await db.transaction('rw', db.tasks, db.timeSessions, db.settings, async () => {
      const task = await db.tasks.get(id);
      if (!task) return;
      const now = Date.now();
      const compute = async () => {
        const col = (await column(status)).filter((t) => t.id !== id);
        const idx = beforeId ? col.findIndex((t) => t.id === beforeId) : -1;
        if (idx === -1) return positionBetween(col.length ? col[col.length - 1].position : undefined, undefined);
        return positionBetween(idx > 0 ? col[idx - 1].position : undefined, col[idx].position);
      };
      let position = await compute();
      if (position === null) {
        await renumber(status);
        position = await compute();
      }
      let next: Task = { ...task, status, position: position ?? 1, updatedAt: now };
      next = applyTaskRules(task, next, now);
      await db.tasks.put(next);
      if (next.status === 'done') await closeOpenSession(id, now);
    });
  },

  async toggleStar(id) {
    await db.tasks
      .where('id')
      .equals(id)
      .modify((t) => {
        t.starred = !t.starred;
        t.updatedAt = Date.now();
      });
  },

  async addSubtask(taskId, title) {
    const v = validate(subtaskTitleSchema, { title });
    if (!v.ok) return v;
    const res = await db.transaction('rw', db.tasks, db.subtasks, async () => {
      if (!(await db.tasks.get(taskId))) return { ok: false as const, errors: { title: 'Tâche introuvable.' } };
      const existing = await db.subtasks.where('taskId').equals(taskId).toArray();
      const sub: Subtask = {
        id: newId(),
        taskId,
        title: v.value.title,
        done: false,
        position: existing.reduce((m, s) => Math.max(m, s.position), 0) + 1,
      };
      await db.subtasks.add(sub);
      return { ok: true as const, value: sub };
    });
    if (res.ok) await applySubtaskRules(taskId);
    return res;
  },

  async renameSubtask(id, title) {
    const v = validate(subtaskTitleSchema, { title });
    if (!v.ok) return v;
    const sub = await db.subtasks.get(id);
    if (!sub) return { ok: false as const, errors: { title: 'Sous-tâche introuvable.' } };
    const next = { ...sub, title: v.value.title };
    await db.subtasks.put(next);
    return { ok: true as const, value: next };
  },

  async toggleSubtask(id) {
    const sub = await db.subtasks.get(id);
    if (!sub) return;
    await db.subtasks.update(id, { done: !sub.done });
    await applySubtaskRules(sub.taskId);
  },

  async removeSubtask(id) {
    const sub = await db.subtasks.get(id);
    if (!sub) return;
    await db.subtasks.delete(id);
    await applySubtaskRules(sub.taskId);
  },

  async addComment(taskId, text) {
    const v = validate(commentSchema, { text });
    if (!v.ok) return v;
    if (!(await db.tasks.get(taskId))) return { ok: false as const, errors: { text: 'Tâche introuvable.' } };
    const c: TaskComment = { id: newId(), taskId, text: v.value.text, createdAt: Date.now() };
    await db.comments.add(c);
    return { ok: true as const, value: c };
  },
};
