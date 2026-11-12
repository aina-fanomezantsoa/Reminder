'use client';

import { useId, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Square, Timer } from 'lucide-react';
import { ACCENT_CLASSES, taskAccent } from '@/lib/accent';
import { cn } from '@/lib/cn';
import { formatDuration, weekdayShortDate } from '@/lib/format';
import { addDaysLocal } from '@/domain/dates';
import { dayMsByTask } from '@/domain/time-sessions';
import type { ID, LocalDate, Task } from '@/domain/types';
import { useActiveSession, useDaySessions, useNow, usePausedTaskId } from '@/data/hooks';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { controlClass } from '@/components/ui/Field';
import { IconButton } from '@/components/ui/IconButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { clock } from '@/components/layout/useRunningTimer';

export interface PlanDayPanelProps {
  date: LocalDate;
  today: LocalDate;
  tasks: Task[];
  onStart: (taskId: ID) => void | Promise<unknown>;
  onPause: () => void | Promise<unknown>;
  onStop: () => void | Promise<unknown>;
  onResetDay: (taskId: ID, date: LocalDate) => void | Promise<unknown>;
  onDateChange?: (date: LocalDate) => void;
}

/** Chronomètre : tâche en cours, temps du jour par tâche, remise à zéro du jour affiché. */
export function PlanDayPanel({ date, today, tasks, onStart, onPause, onStop, onResetDay, onDateChange }: PlanDayPanelProps) {
  const selectId = useId();
  const [picked, setPicked] = useState('');
  const [reset, setReset] = useState<Task | null>(null);
  const sessions = useDaySessions(date);
  const active = useActiveSession();
  const pausedId = usePausedTaskId();
  const now = useNow(!!active);

  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const open = tasks.filter((t) => t.status !== 'done');
  const dayMs = useMemo(() => (sessions ? dayMsByTask(sessions, date, now) : null), [sessions, date, now]);
  const rows = dayMs ? [...dayMs].filter(([id, ms]) => ms > 0 && tasksById.has(id)).sort((a, b) => b[1] - a[1]) : [];
  const activeTask = active ? tasksById.get(active.taskId) : undefined;
  const pausedTask = !active && pausedId ? tasksById.get(pausedId) : undefined;
  const target = picked || open[0]?.id || '';

  const isToday = date === today;
  const label = isToday ? `Aujourd'hui, ${weekdayShortDate(date)}` : weekdayShortDate(date);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted first-letter:uppercase" aria-live="polite">
          {label}
        </p>
        {onDateChange && (
          <div className="flex items-center">
            <IconButton label="Jour précédent" icon={<ChevronLeft className="size-5" />} onClick={() => onDateChange(addDaysLocal(date, -1))} />
            {!isToday && (
              <Button variant="ghost" size="sm" onClick={() => onDateChange(today)}>
                Aujourd&apos;hui
              </Button>
            )}
            <IconButton label="Jour suivant" icon={<ChevronRight className="size-5" />} onClick={() => onDateChange(addDaysLocal(date, 1))} />
          </div>
        )}
      </div>

      {active ? (
        <div className="flex flex-col gap-3 rounded-xl bg-brand-soft p-4 text-ink">
          <p className="flex items-center gap-2 text-xs font-medium text-brand">
            <span aria-hidden className="size-2 animate-pulse rounded-full bg-brand motion-reduce:animate-none" />
            En cours
          </p>
          <p className="truncate text-sm font-medium" title={activeTask?.title}>
            {activeTask?.title ?? 'Tâche'}
          </p>
          <p className="font-display text-2xl font-semibold tabular-nums" role="timer" aria-label={`Temps écoulé : ${formatDuration(now - active.start)}`}>
            {clock(now - active.start)}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" leftIcon={<Pause className="size-4" aria-hidden />} onClick={() => void onPause()}>
              Pause
            </Button>
            <Button variant="secondary" size="sm" leftIcon={<Square className="size-4" aria-hidden />} onClick={() => void onStop()}>
              Arrêter
            </Button>
          </div>
        </div>
      ) : pausedTask ? (
        <div className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-card">
          <p className="text-xs font-medium text-muted">En pause</p>
          <p className="truncate text-sm font-medium text-ink" title={pausedTask.title}>
            {pausedTask.title}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" leftIcon={<Play className="size-4" aria-hidden />} onClick={() => void onStart(pausedTask.id)}>
              Reprendre
            </Button>
            <Button variant="secondary" size="sm" leftIcon={<Square className="size-4" aria-hidden />} onClick={() => void onStop()}>
              Arrêter
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor={selectId} className="text-xs font-medium text-ink">
            Tâche à chronométrer
          </label>
          <select id={selectId} value={target} onChange={(e) => setPicked(e.target.value)} disabled={open.length === 0} className={cn(controlClass(), 'min-h-11 truncate')}>
            {open.length === 0 && <option value="">Aucune tâche en cours</option>}
            {open.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
        <Button size="md" disabled={!target} leftIcon={<Play className="size-4" aria-hidden />} onClick={() => void onStart(target)}>
          Démarrer
        </Button>
      </div>

      {sessions === undefined ? (
        <div aria-busy="true" className="flex flex-col gap-2">
          <Skeleton variant="row" />
        </div>
      ) : rows.length === 0 ? (
        <p className="flex items-center gap-3 rounded-xl bg-surface p-4 text-sm text-body shadow-card">
          <Timer className="size-5 shrink-0 text-brand" aria-hidden />
          {isToday ? 'Aucun temps enregistré aujourd’hui' : 'Aucun temps enregistré ce jour'}
        </p>
      ) : (
        <ul aria-label="Temps du jour par tâche" className="flex flex-col gap-2">
          {rows.map(([id, ms]) => {
            const task = tasksById.get(id)!;
            return (
              <li key={id} className="relative flex items-center gap-3 overflow-hidden rounded-xl bg-surface py-3 pl-3 pr-4 shadow-card">
                <Avatar label={task.title} accent={taskAccent(id)} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink" title={task.title}>
                    {task.title}
                  </p>
                  <p className="text-xs tabular-nums text-muted">{formatDuration(ms)}</p>
                </div>
                <IconButton label={`Remettre à zéro le temps du jour pour ${task.title}`} icon={<RotateCcw className="size-4" />} tone="danger" onClick={() => setReset(task)} />
                <span aria-hidden className={cn('absolute inset-y-0 right-0 w-1', ACCENT_CLASSES[taskAccent(id)].strong)} />
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={reset !== null}
        title="Remettre le jour à zéro ?"
        description={
          reset && (
            <>
              Seul le temps de <strong>{reset.title}</strong> enregistré le <strong>{weekdayShortDate(date)}</strong> sera effacé. Le temps des autres jours est conservé.
            </>
          )
        }
        confirmLabel="Effacer ce jour"
        onCancel={() => setReset(null)}
        onConfirm={() => {
          if (reset) void onResetDay(reset.id, date);
          setReset(null);
        }}
      />
    </div>
  );
}
