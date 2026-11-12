import Dexie, { type EntityTable } from 'dexie';
import type { PlanSlot, Reminder, ReminderEvent, Subtask, Task, TaskComment } from '@/domain/types';

export interface SettingRow {
  key: string;
  value: unknown;
}

export class ReminderDB extends Dexie {
  reminders!: EntityTable<Reminder, 'id'>;
  reminderEvents!: EntityTable<ReminderEvent, 'id'>;
  tasks!: EntityTable<Task, 'id'>;
  subtasks!: EntityTable<Subtask, 'id'>;
  comments!: EntityTable<TaskComment, 'id'>;
  planSlots!: EntityTable<PlanSlot, 'id'>;
  settings!: EntityTable<SettingRow, 'key'>;

  constructor(name = 'reminder') {
    super(name);
    // v1. La table `attachments` n'est créée que si AMB-08 valide les pièces jointes (nouvelle version Dexie alors).
    this.version(1).stores({
      reminders: 'id, nextDueAt, taskId',
      reminderEvents: 'id, reminderId, status',
      tasks: 'id, [status+position], startDate, endDate, completedAt',
      subtasks: 'id, taskId',
      comments: 'id, taskId',
      planSlots: 'id, date',
      settings: 'key',
    });
  }
}

export const db = new ReminderDB();

/** Demande un stockage persistant (atténue la purge Safari). Sans effet côté serveur / navigateur non compatible. */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
    if (await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export const newId = (): string => crypto.randomUUID();
