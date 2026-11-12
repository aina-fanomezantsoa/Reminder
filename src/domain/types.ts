/**
 * CONTRAT PARTAGÉ frontend / backend (ARCHITECTURE.md sections 5 et 7).
 * Figé : toute modification passe par l'architecte.
 *
 * Ajustements demandés par le designer (DESIGN.md section 10), intégrés ici :
 *  - `ReminderEvent.title` : titre dupliqué dans l'événement (le titre reste lisible même si le rappel est supprimé).
 *  - `ReminderFiredDetail` + `REMINDER_FIRED_EVENT` : signal émis par le scheduler pour le toast in-app.
 *  - `useDashboard(ringsLimit)` : voir `data/hooks.ts`.
 */

export type ID = string;
export type LocalDate = string; // 'YYYY-MM-DD'
export type LocalTime = string; // 'HH:mm'
export type EpochMs = number;

// ---------- Rappels ----------
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Reminder {
  id: ID;
  title: string;
  note?: string;
  startDate: LocalDate;
  time: LocalTime;
  recurrence: Recurrence;
  taskId?: ID;
  nextDueAt: EpochMs | null;
  createdAt: EpochMs;
  updatedAt: EpochMs;
}

export interface ReminderEvent {
  id: string; // `${reminderId}:${dueAt}`
  reminderId: ID;
  /** Copie du titre au moment du traitement (demande designer) : survit à la suppression du rappel. */
  title: string;
  dueAt: EpochMs;
  status: 'fired' | 'missed';
  handledAt: EpochMs;
  acknowledged: boolean;
}

/** Détail du CustomEvent `REMINDER_FIRED_EVENT` émis sur `window` par le scheduler (toast in-app). */
export interface ReminderFiredDetail {
  eventId: string;
  reminderId: ID;
  title: string;
  dueAt: EpochMs;
}
export const REMINDER_FIRED_EVENT = 'reminder:fired';

// ---------- Tâches ----------
export type TaskStatus = 'draft' | 'in_progress' | 'editing' | 'done';
export const TASK_STATUSES: readonly TaskStatus[] = ['draft', 'in_progress', 'editing', 'done'];

export interface Task {
  id: ID;
  title: string;
  status: TaskStatus;
  progress: number; // entier 0..100
  starred: boolean;
  startDate: LocalDate;
  endDate: LocalDate;
  position: number;
  completedAt?: EpochMs;
  createdAt: EpochMs;
  updatedAt: EpochMs;
}

export interface Subtask {
  id: ID;
  taskId: ID;
  title: string;
  done: boolean;
  position: number;
}
export interface TaskComment {
  id: ID;
  taskId: ID;
  text: string;
  createdAt: EpochMs;
}
export interface Attachment {
  id: ID;
  taskId: ID;
  name: string;
  mimeType: string;
  size: number;
  blob: Blob;
  createdAt: EpochMs;
} // conditionnel AMB-08 : table non créée en v1

export interface TaskCardData extends Task {
  subtasks: Subtask[];
  commentCount: number;
  attachmentCount: number;
}

// ---------- Chronomètre ----------
/** Session de travail sur une tâche ; `end` absent = chrono en cours. */
export interface TimeSession {
  id: ID;
  taskId: ID;
  start: EpochMs;
  end?: EpochMs;
}

// ---------- Réglages ----------
export interface Profile {
  displayName: string;
}

// ---------- Erreurs de validation ----------
export type FieldErrors<T> = Partial<Record<keyof T & string, string>>;
export type Result<T, I = unknown> = { ok: true; value: T } | { ok: false; errors: FieldErrors<I> };

// ---------- Rappels : contrat ----------
export interface ReminderInput {
  title: string;
  note?: string;
  startDate: LocalDate;
  time: LocalTime;
  recurrence: Recurrence;
  taskId?: ID;
}
export interface ReminderOccurrence {
  reminderId: ID;
  title: string;
  at: EpochMs;
  recurring: boolean;
}

export interface ReminderService {
  create(input: ReminderInput): Promise<Result<Reminder, ReminderInput>>;
  update(id: ID, input: ReminderInput): Promise<Result<Reminder, ReminderInput>>;
  remove(id: ID): Promise<void>;
  occurrencesBetween(from: LocalDate, to: LocalDate): Promise<ReminderOccurrence[]>;
  acknowledgeMissed(eventId: string): Promise<void>;
}

// ---------- Tâches : contrat ----------
export interface TaskInput {
  title: string;
  startDate: LocalDate;
  endDate: LocalDate;
  status?: TaskStatus;
  progress?: number;
  starred?: boolean;
}
export type TaskBoard = Record<TaskStatus, TaskCardData[]>;

export interface TaskService {
  create(input: TaskInput): Promise<Result<Task, TaskInput>>;
  update(id: ID, patch: Partial<TaskInput>): Promise<Result<Task, TaskInput>>;
  remove(id: ID): Promise<void>;
  remindersOf(taskId: ID): Promise<Reminder[]>;
  move(id: ID, status: TaskStatus, beforeId?: ID): Promise<void>;
  toggleStar(id: ID): Promise<void>;
  addSubtask(taskId: ID, title: string): Promise<Result<Subtask, { title: string }>>;
  renameSubtask(id: ID, title: string): Promise<Result<Subtask, { title: string }>>;
  toggleSubtask(id: ID): Promise<void>;
  removeSubtask(id: ID): Promise<void>;
  addComment(taskId: ID, text: string): Promise<Result<TaskComment, { text: string }>>;
}

// ---------- Statistiques ----------
export interface RingMetric {
  taskId: ID;
  label: string;
  percent: number;
}
/** `label` = jour abrégé FR ('lun.') ; le numéro du jour se déduit de `date`. */
export interface BarDatum {
  label: string;
  date: LocalDate;
  count: number;
}
export type ComputeRings = (tasks: Task[], limit: number) => RingMetric[];
export type CompletedPerDay = (tasks: Task[], days: number, today: LocalDate) => BarDatum[];

// ---------- Notifications ----------
export type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';
export interface NotificationService {
  permission(): PermissionState;
  requestPermission(): Promise<PermissionState>;
  start(): void;
  stop(): void;
}
