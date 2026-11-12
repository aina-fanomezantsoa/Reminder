import { db, newId } from '../db';
import {
  commentSchema,
  subtaskTitleSchema,
  taskInputSchema,
  taskPatchSchema,
  validate,
} from '@/domain/schemas';
import { applyTaskRules, positionBetween } from '@/domain/task-rules';
import type {
  ID,
  Reminder,
  Subtask,
  Task,
  TaskComment,
  TaskInput,
  TaskService,
  TaskStatus,
} from '@/domain/types';

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;

async function column(status: TaskStatus): Promise<Task[]> {
  const rows = await db.tasks.where('[status+position]').between([status, -Infinity], [status, Infinity]).toArray();
  return rows.sort(byPosition);
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
    return db.transaction('rw', db.tasks, async () => {
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
      return { ok: true as const, value: next };
    });
  },

  async remove(id) {
    await db.transaction('rw', [db.tasks, db.subtasks, db.comments, db.reminders, db.planSlots], async () => {
      await db.subtasks.where('taskId').equals(id).delete();
      await db.comments.where('taskId').equals(id).delete();
      await db.reminders.where('taskId').equals(id).modify((r: Reminder) => {
        delete r.taskId;
      });
      await db.planSlots.filter((s) => s.taskId === id).modify((s) => {
        delete s.taskId;
      });
      await db.tasks.delete(id);
    });
  },

  async remindersOf(taskId) {
    return db.reminders.where('taskId').equals(taskId).toArray();
  },

  async move(id, status, beforeId) {
    await db.transaction('rw', db.tasks, async () => {
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
    });
  },

  async toggleStar(id) {
    await db.tasks.where('id').equals(id).modify((t) => {
      t.starred = !t.starred;
      t.updatedAt = Date.now();
    });
  },

  async addSubtask(taskId, title) {
    const v = validate(subtaskTitleSchema, { title });
    if (!v.ok) return v;
    return db.transaction('rw', db.tasks, db.subtasks, async () => {
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
    await db.subtasks.where('id').equals(id).modify((s) => {
      s.done = !s.done;
    });
  },

  async removeSubtask(id) {
    await db.subtasks.delete(id);
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
