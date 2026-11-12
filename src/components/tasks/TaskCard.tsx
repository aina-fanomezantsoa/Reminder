'use client';

import { useState, type HTMLAttributes, type Ref } from 'react';
import { Check, Circle, GripVertical, Timer } from 'lucide-react';
import { cn } from '@/lib/cn';
import { taskAccent } from '@/lib/accent';
import { dateRange, formatDuration } from '@/lib/format';
import { totalMs } from '@/domain/time-sessions';
import { useNow, useTaskComments, useTaskSessions } from '@/data/hooks';
import type { ID, TaskCardData, TaskStatus } from '@/domain/types';
import { Counter } from '@/components/ui/Counter';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StarButton } from '@/components/ui/StarButton';
import { StatusMenu } from './StatusMenu';

export interface TaskCardProps {
  task: TaskCardData;
  showAttachments: boolean;
  onOpen: (id: ID) => void;
  onToggleStar: (id: ID) => void;
  onToggleSubtask: (subtaskId: ID) => void;
  onMove: (id: ID, status: TaskStatus) => void;
  onDelete: (id: ID) => void;
  isDragging?: boolean;
  /** Poignée de glisser-déposer (clavier). Absente : pas de poignée (mobile). */
  dragHandleRef?: Ref<HTMLButtonElement>;
  dragHandleProps?: HTMLAttributes<HTMLButtonElement>;
}

const MAX_SUBTASKS = 3;

export function TaskCard({ task, showAttachments, onOpen, onToggleStar, onToggleSubtask, onMove, onDelete, isDragging, dragHandleRef, dragHandleProps }: TaskCardProps) {
  const done = task.status === 'done';
  const doneCount = task.subtasks.filter((s) => s.done).length;
  const visible = task.subtasks.slice(0, MAX_SUBTASKS);
  const extra = task.subtasks.length - visible.length;

  return (
    <article
      aria-label={task.title}
      className={cn('flex flex-col gap-3 rounded-2xl bg-surface p-4 xl:p-5 shadow-card transition-opacity duration-150 motion-reduce:transition-none', isDragging && 'opacity-40')}
    >
      <div className="flex items-start gap-1">
        <h3 className="min-w-0 flex-1 pt-2.5">
          <button
            type="button"
            onClick={() => onOpen(task.id)}
            title={task.title}
            className="line-clamp-2 w-full rounded text-left font-display text-base font-semibold text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            {task.title}
          </button>
        </h3>
        <StatusMenu
          current={task.status}
          onChange={(s) => onMove(task.id, s)}
          onEdit={() => onOpen(task.id)}
          onDelete={() => onDelete(task.id)}
          triggerLabel={`Actions pour ${task.title}`}
        />
      </div>

      <p className="text-xs font-medium text-subtle">{dateRange(task.startDate, task.endDate)}</p>
      <TaskTime taskId={task.id} />

      {task.subtasks.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-medium text-ink">
            <span>Sous-tâches</span>
            <span className="tabular-nums" aria-label={`${doneCount} sur ${task.subtasks.length} terminées`}>
              {doneCount}/{task.subtasks.length}
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {visible.map((s) => (
              <li key={s.id} className="flex items-center gap-2 rounded-xl bg-canvas pr-2">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={s.done}
                  aria-label={s.title}
                  onClick={() => onToggleSubtask(s.id)}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {s.done ? <Check className="size-4 text-st-done-ink" aria-hidden /> : <Circle className="size-4 text-subtle" aria-hidden />}
                </button>
                <span className={cn('truncate text-xs font-medium', s.done ? 'text-subtle line-through' : 'text-ink')} aria-hidden>
                  {s.title}
                </span>
              </li>
            ))}
          </ul>
          {extra > 0 && (
            <button
              type="button"
              onClick={() => onOpen(task.id)}
              className="self-start rounded text-xs font-medium text-brand underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              + {extra} autre{extra > 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        {dragHandleProps && (
          <button
            ref={dragHandleRef}
            type="button"
            aria-label={`Déplacer la tâche ${task.title}`}
            {...dragHandleProps}
            className="-ml-2 inline-flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-[10px] text-subtle hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            <GripVertical className="size-5" aria-hidden />
          </button>
        )}
        <CommentHover taskId={task.id} count={task.commentCount} />
        {showAttachments && <Counter icon="attachment" count={task.attachmentCount} />}
        <span className="ml-auto">
          <StarButton active={task.starred} onToggle={() => onToggleStar(task.id)} label={task.starred ? 'Retirer des favoris' : 'Ajouter aux favoris'} />
        </span>
      </div>

      <ProgressBar value={task.progress} accent={done ? 'done' : taskAccent(task.id)} showLabel label="Progression" />
    </article>
  );
}

/** Compteur de commentaires ; au survol (ou focus) affiche leur contenu. Requête chargée seulement à l'ouverture. */
function CommentHover({ taskId, count }: { taskId: ID; count: number }) {
  const [open, setOpen] = useState(false);
  const comments = useTaskComments(open ? taskId : undefined);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button type="button" className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
        <Counter icon="comment" count={count} />
      </button>
      {open && count > 0 && (
        <div role="tooltip" className="absolute bottom-full left-0 z-20 mb-2 flex max-h-48 w-64 flex-col gap-2 overflow-y-auto rounded-xl bg-surface p-3 text-xs text-ink shadow-card ring-1 ring-black/5">
          {comments === undefined && <p className="text-subtle">Chargement…</p>}
          {comments?.map((c) => (
            <p key={c.id} className="whitespace-pre-wrap break-words">
              {c.text}
            </p>
          ))}
        </div>
      )}
    </span>
  );
}

/** Temps total chronométré (monte en direct si la tâche est en cours) ; rien si aucun temps. */
function TaskTime({ taskId }: { taskId: ID }) {
  const sessions = useTaskSessions(taskId);
  const running = !!sessions?.some((s) => s.end === undefined);
  const now = useNow(running);
  const ms = sessions ? totalMs(sessions, now) : 0;
  if (ms <= 0 && !running) return null;
  return (
    <p className={cn('flex items-center gap-1 text-xs font-medium tabular-nums', running ? 'text-brand' : 'text-subtle')}>
      <Timer className="size-3.5" aria-hidden />
      <span className="sr-only">Temps passé : </span>
      {formatDuration(ms)}
      {running && <span className="sr-only"> (chrono en cours)</span>}
    </p>
  );
}
