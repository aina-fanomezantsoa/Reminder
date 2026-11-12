import type { TaskStatus } from '@/domain/types';

export const STATUS_LABELS: Record<TaskStatus, string> = {
  draft: 'Brouillon',
  in_progress: 'En cours',
  editing: 'En édition',
  done: 'Terminé',
};

/** Classes statiques (détectées par Tailwind). dot = fond coloré, ink = texte sur blanc. */
export const STATUS_STYLES: Record<TaskStatus, { dot: string; ink: string; ring: string }> = {
  draft: { dot: 'bg-st-draft', ink: 'text-st-draft-ink', ring: 'ring-st-draft' },
  in_progress: { dot: 'bg-st-progress', ink: 'text-st-progress-ink', ring: 'ring-st-progress' },
  editing: { dot: 'bg-st-editing', ink: 'text-st-editing-ink', ring: 'ring-st-editing' },
  done: { dot: 'bg-st-done', ink: 'text-st-done-ink', ring: 'ring-st-done' },
};

export const MAX_TITLE = 200;
