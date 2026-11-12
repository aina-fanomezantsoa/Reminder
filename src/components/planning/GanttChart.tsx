'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ACCENT_CLASSES, taskAccent } from '@/lib/accent';
import { STATUS_LABELS } from '@/lib/constants';
import { dateRange, shortDate } from '@/lib/format';
import { addDaysLocal, diffDaysLocal, parseLocalDate } from '@/domain/dates';
import type { ID, LocalDate, Task, TaskStatus } from '@/domain/types';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { StatusMenu } from '@/components/tasks/StatusMenu';

export interface GanttChartProps {
  tasks: Task[];
  windowStart: LocalDate;
  days: number;
  today: LocalDate;
  variant: 'compact' | 'full';
  onWindowChange: (start: LocalDate) => void;
  onOpenTask: (id: ID) => void;
  /** Changement de statut depuis le menu de l'étiquette (optionnel). */
  onChangeStatus?: (id: ID, status: TaskStatus) => void;
  /** Action de l'état vide (aucune tâche du tout). */
  onCreateTask?: () => void;
}

const CFG = {
  compact: { dayW: 40, rowH: 48, maxRows: 4 },
  full: { dayW: 56, rowH: 56, maxRows: Infinity },
};
const HEADER_H = 56;
const ROW_GAP = 12;

/** Gantt en lecture seule (AMB-14) : CSS grid + barres positionnées en pourcentage de la fenêtre. */
export function GanttChart({ tasks, windowStart, days, today, variant, onWindowChange, onOpenTask, onChangeStatus, onCreateTask }: GanttChartProps) {
  const { dayW, rowH, maxRows } = CFG[variant];
  const full = variant === 'full';

  const dayList = useMemo(() => Array.from({ length: days }, (_, i) => addDaysLocal(windowStart, i)), [windowStart, days]);
  const todayIdx = today ? diffDaysLocal(windowStart, today) : -1;

  const rows = useMemo(
    () =>
      tasks
        .map((t) => ({ task: t, s: diffDaysLocal(windowStart, t.startDate), e: diffDaysLocal(windowStart, t.endDate) }))
        .filter((r) => r.e >= 0 && r.s < days)
        .sort((a, b) => a.task.startDate.localeCompare(b.task.startDate) || a.task.position - b.task.position),
    [tasks, windowStart, days],
  );

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={<CalendarRange className="size-7" />}
        title="Aucune tâche à afficher"
        description="Les tâches créées apparaissent ici avec leurs dates."
        action={onCreateTask ? { label: 'Créer une tâche', onClick: onCreateTask } : undefined}
      />
    );
  }

  const rangeLabel = `${shortDate(dayList[0])} - ${shortDate(dayList[days - 1])}`;
  const labelW = 'w-14 sm:w-[200px] xl:w-[260px]';
  const maxHeight = maxRows === Infinity ? undefined : HEADER_H + maxRows * (rowH + ROW_GAP);

  return (
    <div className="flex flex-col gap-3">
      {full && (
        <div className="flex flex-wrap items-center gap-2">
          <IconButton label="Période précédente" icon={<ChevronLeft className="size-5" />} className="bg-surface shadow-pill" onClick={() => onWindowChange(addDaysLocal(windowStart, -7))} />
          <Button variant="secondary" size="sm" onClick={() => onWindowChange(addDaysLocal(today, -2))}>
            Aujourd&apos;hui
          </Button>
          <IconButton label="Période suivante" icon={<ChevronRight className="size-5" />} className="bg-surface shadow-pill" onClick={() => onWindowChange(addDaysLocal(windowStart, 7))} />
          <span className="ml-2 text-sm font-medium text-ink" aria-live="polite">
            {rangeLabel}
          </span>
        </div>
      )}

      <div className="overflow-auto rounded-2xl" style={{ maxHeight }} tabIndex={0} role="region" aria-label="Diagramme de Gantt (défilement)">
        <div role="table" aria-label={`Planning des tâches, du ${rangeLabel}`} style={{ minWidth: undefined }}>
          <div role="rowgroup" className="sr-only">
            <div role="row">
              <div role="columnheader">Tâche</div>
              <div role="columnheader">Période et avancement</div>
            </div>
          </div>

          {/* En-tête des jours (décoratif : les dates sont dans les lignes) */}
          <div aria-hidden className="sticky top-0 z-20 flex bg-stage" style={{ height: HEADER_H }}>
            <div className={cn('sticky left-0 z-10 shrink-0 bg-stage', labelW)} />
            <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))`, minWidth: days * dayW }}>
              {dayList.map((d, i) => {
                const date = parseLocalDate(d);
                const dow = date.getDay();
                const weekend = dow === 0 || dow === 6;
                const isToday = i === todayIdx;
                const dayNum = format(date, 'dd');
                return (
                  <div key={d} className={cn('flex flex-col items-center justify-center gap-0.5 border-l border-line text-xs', isToday && 'bg-brand/5')}>
                    <span className={cn('font-medium tabular-nums', isToday ? 'flex size-7 items-center justify-center rounded-full bg-brand text-white' : weekend ? 'text-muted' : 'text-ink')}>
                      {dayNum}
                    </span>
                    <span className={cn('font-medium', isToday ? 'text-brand' : 'text-muted')}>{isToday ? 'Auj.' : dayNum === '01' ? format(date, 'MMM', { locale: fr }) : ' '}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div role="rowgroup">
            {rows.map(({ task, s, e }) => (
              <GanttRow
                key={task.id}
                task={task}
                s={s}
                e={e}
                days={days}
                dayW={dayW}
                rowH={rowH}
                todayIdx={todayIdx}
                labelW={labelW}
                onOpen={onOpenTask}
                onChangeStatus={onChangeStatus}
              />
            ))}
          </div>
        </div>
      </div>

      {rows.length === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3 text-sm text-body shadow-card">
          <span>Aucune tâche sur cette période.</span>
          <Button variant="secondary" size="sm" onClick={() => onWindowChange(addDaysLocal(today, -2))}>
            Aujourd&apos;hui
          </Button>
        </div>
      )}
    </div>
  );
}

function GanttRow({
  task,
  s,
  e,
  days,
  dayW,
  rowH,
  todayIdx,
  labelW,
  onOpen,
  onChangeStatus,
}: {
  task: Task;
  s: number;
  e: number;
  days: number;
  dayW: number;
  rowH: number;
  todayIdx: number;
  labelW: string;
  onOpen: (id: ID) => void;
  onChangeStatus?: (id: ID, status: TaskStatus) => void;
}) {
  const accent = ACCENT_CLASSES[taskAccent(task.id)];
  const spanDays = e - s + 1;
  const left = (s / days) * 100;
  const width = (spanDays / days) * 100;
  const p = Math.min(100, Math.max(0, task.progress));
  const insidePct = p >= 30;
  const showPct = spanDays >= 2;
  const summary = `du ${shortDate(task.startDate)} au ${shortDate(task.endDate)}, ${p} % terminé, statut ${STATUS_LABELS[task.status]}`;

  return (
    <div role="row" className="flex" style={{ paddingTop: ROW_GAP / 2, paddingBottom: ROW_GAP / 2 }}>
      <div role="cell" className={cn('sticky left-0 z-10 shrink-0 bg-stage pr-3', labelW)}>
        <div className="flex items-center gap-1 rounded-full bg-surface pl-2 pr-1 shadow-pill" style={{ height: rowH }}>
          <button
            type="button"
            onClick={() => onOpen(task.id)}
            aria-label={`${task.title}, ${summary}`}
            title={task.title}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-full py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            <Avatar label={task.title} accent={taskAccent(task.id)} size="md" />
            <span className="hidden min-w-0 flex-1 flex-col sm:flex">
              <span className="truncate text-xs font-medium text-ink">{task.title}</span>
              <span className="truncate text-xs font-medium text-subtle">{dateRange(task.startDate, task.endDate)}</span>
            </span>
          </button>
          {onChangeStatus && (
            <span className="hidden sm:block">
              <StatusMenu current={task.status} onChange={(st) => onChangeStatus(task.id, st)} onEdit={() => onOpen(task.id)} triggerLabel={`Actions pour ${task.title}`} />
            </span>
          )}
        </div>
      </div>

      <div role="cell" className="relative flex-1 overflow-hidden" style={{ height: rowH, minWidth: days * dayW }}>
        <span className="sr-only">{summary}</span>
        {/* lignes verticales + jour courant (décoratifs) */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ backgroundImage: 'linear-gradient(to right, transparent calc(100% - 1px), var(--color-line) calc(100% - 1px))', backgroundSize: `${100 / days}% 100%` }}
        />
        {todayIdx >= 0 && todayIdx < days && (
          <div aria-hidden className="absolute inset-y-0 border-l-2 border-brand bg-brand/5" style={{ left: `${(todayIdx / days) * 100}%`, width: `${100 / days}%` }} />
        )}

        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={() => onOpen(task.id)}
          title={`${task.title} : ${p} %`}
          className={cn('absolute inset-y-0 cursor-pointer overflow-hidden rounded-full text-left', accent.soft)}
          style={{ left: `${left}%`, width: `${width}%` }}
        >
          {p > 0 && <span className={cn('absolute inset-y-0 left-0 rounded-full', accent.strong)} style={{ width: `${p}%` }} />}
          {showPct && (
            <span
              className={cn(
                'absolute inset-y-0 flex items-center font-display text-sm font-semibold tabular-nums',
                insidePct ? cn('justify-end pr-4', accent.onStrong) : accent.ink,
              )}
              style={insidePct ? { left: 0, width: `${p}%` } : { left: `${p}%`, paddingLeft: 12 }}
            >
              {p} %
            </span>
          )}
          {s < 0 && <ChevronLeft aria-hidden className={cn('absolute left-1 top-1/2 size-4 -translate-y-1/2', accent.ink)} />}
          {e >= days && <ChevronRight aria-hidden className={cn('absolute right-1 top-1/2 size-4 -translate-y-1/2', accent.ink)} />}
        </button>
      </div>
    </div>
  );
}
