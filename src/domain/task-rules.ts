import type { EpochMs, Task, TaskStatus } from './types';

/** Champs modifiables d'une tâche (hors id/dates de création). */
export type TaskFields = Pick<
  Task,
  'title' | 'status' | 'progress' | 'starred' | 'startDate' | 'endDate' | 'completedAt'
>;

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

export const DEFAULT_TASK_STATUS: TaskStatus = 'draft';

/** Position pour insérer entre `prev` et `next` (positions réelles) ; null si l'écart est épuisé (rééquilibrer). */
export function positionBetween(prev: number | undefined, next: number | undefined): number | null {
  if (prev === undefined && next === undefined) return 1;
  if (prev === undefined) return (next as number) - 1;
  if (next === undefined) return prev + 1;
  const mid = (prev + next) / 2;
  return mid > prev && mid < next ? mid : null;
}
