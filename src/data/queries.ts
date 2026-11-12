import { addDays, startOfWeek } from 'date-fns';
import { db } from './db';
import { formatLocalDate, parseLocalDate } from '@/domain/dates';
import { reminderService } from './services/reminders';
import { TASK_STATUSES } from '@/domain/types';
import type {
  ID,
  LocalDate,
  Reminder,
  ReminderEvent,
  ReminderOccurrence,
  Subtask,
  Task,
  TaskBoard,
  TaskCardData,
  TaskComment,
} from '@/domain/types';

/**
 * Lecteurs purs (sans React) derrière les hooks de `hooks.ts` : testables sans navigateur.
 * Chaque fonction lit Dexie, donc `useLiveQuery` re-déclenche à toute écriture concernée.
 */

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;

/** Assemble les cartes : sous-tâches triées, compteurs dérivés (jamais stockés). Pièces jointes : table absente en v1 => 0. */
export function buildTaskCards(
  tasks: Task[],
  subtasks: Subtask[],
  comments: Pick<TaskComment, 'taskId'>[],
): TaskCardData[] {
  const subsBy = new Map<ID, Subtask[]>();
  for (const s of subtasks) {
    const l = subsBy.get(s.taskId);
    if (l) l.push(s);
    else subsBy.set(s.taskId, [s]);
  }
  const commentCount = new Map<ID, number>();
  for (const c of comments) commentCount.set(c.taskId, (commentCount.get(c.taskId) ?? 0) + 1);
  return tasks.map((t) => ({
    ...t,
    subtasks: (subsBy.get(t.id) ?? []).sort(byPosition),
    commentCount: commentCount.get(t.id) ?? 0,
    attachmentCount: 0,
  }));
}

export function groupBoard(cards: TaskCardData[]): TaskBoard {
  const board = {} as TaskBoard;
  for (const s of TASK_STATUSES) board[s] = [];
  for (const c of cards) board[c.status].push(c);
  for (const s of TASK_STATUSES) board[s].sort(byPosition);
  return board;
}

async function loadCards(tasks: Task[]): Promise<TaskCardData[]> {
  const [subtasks, comments] = await Promise.all([db.subtasks.toArray(), db.comments.toArray()]);
  return buildTaskCards(tasks, subtasks, comments);
}

export async function loadTaskBoard(): Promise<TaskBoard> {
  return groupBoard(await loadCards(await db.tasks.toArray()));
}

/** Toutes les tâches, triées par date de début puis de fin (Gantt). */
export async function loadTasks(): Promise<Task[]> {
  const tasks = await db.tasks.toArray();
  return tasks.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate) || a.createdAt - b.createdAt);
}

/** `null` si la tâche n'existe pas (ou plus). */
export async function loadTask(id: ID): Promise<TaskCardData | null> {
  const t = await db.tasks.get(id);
  if (!t) return null;
  const [subs, commentCount] = await Promise.all([
    db.subtasks.where('taskId').equals(id).toArray(),
    db.comments.where('taskId').equals(id).count(),
  ]);
  return { ...t, subtasks: subs.sort(byPosition), commentCount, attachmentCount: 0 };
}

export async function loadTaskComments(taskId: ID): Promise<TaskComment[]> {
  return (await db.comments.where('taskId').equals(taskId).toArray()).sort((a, b) => a.createdAt - b.createdAt);
}

export async function loadTaskReminders(taskId: ID): Promise<Reminder[]> {
  const rows = await db.reminders.where('taskId').equals(taskId).toArray();
  return rows.sort((a, b) => (a.nextDueAt ?? Infinity) - (b.nextDueAt ?? Infinity));
}

export interface ReminderLists {
  /** Rappels ayant une prochaine échéance, par date croissante. */
  upcoming: Reminder[];
  /** Rappels terminés (non récurrents déjà déclenchés ou manqués), les plus récents d'abord. */
  past: Reminder[];
  /** Occurrences manquées non acquittées, les plus récentes d'abord. */
  missed: ReminderEvent[];
}

export async function loadReminderLists(): Promise<ReminderLists> {
  const [all, missed] = await Promise.all([
    db.reminders.toArray(),
    db.reminderEvents.where('status').equals('missed').toArray(),
  ]);
  const upcoming = all.filter((r) => r.nextDueAt !== null).sort((a, b) => (a.nextDueAt as number) - (b.nextDueAt as number));
  const past = all
    .filter((r) => r.nextDueAt === null)
    .sort((a, b) => (b.startDate + b.time).localeCompare(a.startDate + a.time));
  return { upcoming, past, missed: missed.filter((e) => !e.acknowledged).sort((a, b) => b.dueAt - a.dueAt) };
}

/** Plage affichée par la grille mensuelle : 6 semaines complètes (lundi-dimanche) contenant le mois. */
export function calendarGridRange(monthStart: LocalDate): { from: LocalDate; to: LocalDate } {
  const first = parseLocalDate(monthStart);
  const gridStart = startOfWeek(new Date(first.getFullYear(), first.getMonth(), 1), { weekStartsOn: 1 });
  return { from: formatLocalDate(gridStart), to: formatLocalDate(addDays(gridStart, 41)) };
}

export async function loadCalendarEntries(
  monthStart: LocalDate,
): Promise<{ tasks: Task[]; reminders: ReminderOccurrence[] }> {
  const { from, to } = calendarGridRange(monthStart);
  const tasks = (await db.tasks.where('startDate').belowOrEqual(to).filter((t) => t.endDate >= from).toArray()).sort(
    (a, b) => a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate),
  );
  return { tasks, reminders: await reminderService.occurrencesBetween(from, to) };
}
