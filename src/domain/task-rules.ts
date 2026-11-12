import type { EpochMs, Task, TaskStatus } from './types';

/** Champs modifiables d'une tâche (hors id/dates de création). */
export type TaskFields = Pick<Task, 'title' | 'status' | 'progress' | 'starred' | 'startDate' | 'endDate' | 'completedAt'>;

/**
 * Applique les règles de statut / progression (AMB-07, AMB-09) :
 *  - résultat 'done'  => progress = 100 ; completedAt posé (conservé s'il l'était déjà) ;
 *  - quitter 'done'   => completedAt retiré, progression conservée ;
 *  - transitions libres entre statuts.
 */
export function applyTaskRules<T extends TaskFields>(current: T | null, next: T, now: EpochMs): T {
  const out = { ...next };
  if (out.status === 'done') {
    out.progress = 100;
    out.completedAt = current?.status === 'done' && current.completedAt != null ? current.completedAt : now;
  } else {
    delete out.completedAt;
  }
  return out;
}

/** Progression (0..100) = part de sous-tâches cochées ; 0 s'il n'y en a aucune. */
export function subtaskProgress(subtasks: readonly { done: boolean }[]): number {
  if (subtasks.length === 0) return 0;
  return Math.round((subtasks.filter((s) => s.done).length / subtasks.length) * 100);
}

/** Colonne imposée par les sous-tâches cochées : toutes → done, 2 ou plus → editing, 1 → in_progress, aucune → null (inchangé). */
export function statusFromSubtasks(subtasks: readonly { done: boolean }[]): TaskStatus | null {
  const n = subtasks.filter((s) => s.done).length;
  if (n === 0) return null;
  if (n === subtasks.length) return 'done';
  return n >= 2 ? 'editing' : 'in_progress';
}

export const DEFAULT_TASK_STATUS: TaskStatus = 'draft';

/** Position pour insérer entre `prev` et `next` (positions réelles) ; null si l'écart est épuisé (rééquilibrer). */
export function positionBetween(prev: number | undefined, next: number | undefined): number | null {
  if (prev === undefined && next === undefined) return 1;
  if (prev === undefined) return (next as number) - 1;
  if (next === undefined) return prev + 1;
  const mid = (prev + next) / 2;
  return mid > prev && mid < next ? mid : null;
}
