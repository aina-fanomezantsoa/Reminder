'use client';

import { useMemo, useState } from 'react';
import { addDays, addMonths, differenceInCalendarDays, endOfMonth, format, startOfMonth, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Bell, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ACCENT_CLASSES, taskAccent } from '@/lib/accent';
import { longDate } from '@/lib/format';
import { useMediaQuery } from '@/lib/use-media';
import { formatLocalDate, fromEpochMs, parseLocalDate } from '@/domain/dates';
import type { ID, LocalDate, ReminderOccurrence, Task } from '@/domain/types';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';

export interface CalendarMonthProps {
  /** Premier jour du mois affiché. */
  monthStart: LocalDate;
  /** `undefined` pendant le chargement. */
  entries: { tasks: Task[]; reminders: ReminderOccurrence[] } | undefined;
  today: LocalDate;
  onMonthChange: (monthStart: LocalDate) => void;
  onSelectTask: (id: ID) => void;
  onSelectReminder: (id: ID) => void;
  onCreateTask: (date: LocalDate) => void;
  onCreateReminder: (date: LocalDate) => void;
}

const WEEKDAYS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];

/** Jours affichés : semaines complètes (lundi-dimanche) couvrant le mois, 5 ou 6 lignes. */
export function monthGrid(monthStart: LocalDate): LocalDate[] {
  const first = startOfMonth(parseLocalDate(monthStart));
  const gridStart = startOfWeek(first, { weekStartsOn: 1 });
  const last = endOfMonth(first);
  const weeks = Math.ceil((differenceInCalendarDays(last, gridStart) + 1) / 7);
  return Array.from({ length: weeks * 7 }, (_, i) => formatLocalDate(addDays(gridStart, i)));
}

const reminderTime = (o: ReminderOccurrence) => fromEpochMs(o.at).time;

export function CalendarMonth({
  monthStart,
  entries,
  today,
  onMonthChange,
  onSelectTask,
  onSelectReminder,
  onCreateTask,
  onCreateReminder,
}: CalendarMonthProps) {
  const [dayOpen, setDayOpen] = useState<LocalDate | null>(null);
  const dots = useMediaQuery('(max-width: 767px)');
  const wide = useMediaQuery('(min-width: 1024px)');
  const maxVisible = wide ? 3 : 2;

  const days = useMemo(() => monthGrid(monthStart), [monthStart]);
  const month = startOfMonth(parseLocalDate(monthStart));
  const monthKey = format(month, 'yyyy-MM');

  const byDay = useMemo(() => {
    const map = new Map<LocalDate, { tasks: Task[]; reminders: ReminderOccurrence[] }>();
    for (const d of days) map.set(d, { tasks: [], reminders: [] });
    for (const t of entries?.tasks ?? []) {
      for (const d of days) {
        if (d >= t.startDate && d <= t.endDate) map.get(d)?.tasks.push(t);
      }
    }
    for (const r of entries?.reminders ?? []) map.get(fromEpochMs(r.at).date)?.reminders.push(r);
    for (const v of map.values()) v.reminders.sort((a, b) => a.at - b.at);
    return map;
  }, [days, entries]);

  const go = (m: Date) => onMonthChange(formatLocalDate(startOfMonth(m)));
  const title = format(month, 'LLLL yyyy', { locale: fr });
  const detail = dayOpen ? byDay.get(dayOpen) : undefined;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 aria-live="polite" className="font-display text-lg font-semibold capitalize text-ink">
          {title}
        </h2>
        <div className="flex items-center gap-1">
          <IconButton
            label="Mois précédent"
            icon={<ChevronLeft className="size-5" />}
            className="bg-surface shadow-pill"
            onClick={() => go(addMonths(month, -1))}
          />
          <Button variant="secondary" onClick={() => go(parseLocalDate(today || formatLocalDate(new Date())))}>
            Aujourd&apos;hui
          </Button>
          <IconButton
            label="Mois suivant"
            icon={<ChevronRight className="size-5" />}
            className="bg-surface shadow-pill"
            onClick={() => go(addMonths(month, 1))}
          />
        </div>
      </div>

      {entries === undefined ? (
        <div aria-busy="true" aria-label="Chargement du calendrier" className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }, (_, i) => (
            <Skeleton key={i} variant="row" className="h-20 sm:h-28" />
          ))}
        </div>
      ) : (
        <div role="group" aria-label={`Calendrier, ${title}`} className="grid grid-cols-7 gap-2 sm:gap-2">
          {WEEKDAYS.map((w) => (
            <div key={w} aria-hidden className="pb-1 text-center text-xs font-medium text-muted first-letter:uppercase">
              {w}
            </div>
          ))}
          {days.map((d) => {
            const cell = byDay.get(d) ?? { tasks: [], reminders: [] };
            const inMonth = format(parseLocalDate(d), 'yyyy-MM') === monthKey;
            const isToday = d === today;
            const all = cell.tasks.length + cell.reminders.length;
            const items: Array<{ key: string; node: React.ReactNode }> = [
              ...cell.tasks.map((t) => {
                const a = ACCENT_CLASSES[taskAccent(t.id)];
                const first = t.startDate === d;
                const last = t.endDate === d;
                return {
                  key: `t-${t.id}`,
                  node: (
                    <button
                      type="button"
                      onClick={() => onSelectTask(t.id)}
                      title={t.title}
                      className={cn(
                        'block w-full truncate px-2 py-0.5 text-left text-xs font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                        a.soft,
                        first ? 'rounded-l-full' : 'rounded-l-none',
                        last ? 'rounded-r-full' : 'rounded-r-none',
                      )}
                    >
                      <span className="sr-only">Tâche : </span>
                      {t.title}
                    </button>
                  ),
                };
              }),
              ...cell.reminders.map((r) => ({
                key: `r-${r.reminderId}-${r.at}`,
                node: (
                  <button
                    type="button"
                    onClick={() => onSelectReminder(r.reminderId)}
                    title={`${reminderTime(r)} ${r.title}`}
                    className="flex w-full items-center gap-1 truncate rounded-md border-l-2 border-brand bg-white/80 px-2 py-0.5 text-left text-xs font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <Bell className="size-3 shrink-0 text-brand" aria-hidden />
                    <span className="sr-only">Rappel : </span>
                    <span className="truncate">
                      {reminderTime(r)} {r.title}
                    </span>
                  </button>
                ),
              })),
            ];
            const visible = dots ? [] : items.slice(0, maxVisible);
            const more = dots ? 0 : items.length - visible.length;

            return (
              <div
                key={d}
                className={cn(
                  'flex min-h-20 min-w-0 flex-col gap-1 rounded-xl p-2 shadow-card sm:min-h-28 sm:p-2',
                  inMonth ? 'bg-surface' : 'bg-white/50 text-subtle shadow-none',
                )}
              >
                <button
                  type="button"
                  onClick={() => setDayOpen(d)}
                  aria-label={`${longDate(d)}${all > 0 ? `, ${all} élément${all > 1 ? 's' : ''}` : ''}`}
                  aria-current={isToday ? 'date' : undefined}
                  className={cn(
                    'flex size-7 items-center justify-center self-start rounded-full text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                    isToday ? 'bg-brand text-white' : inMonth ? 'text-ink hover:bg-brand-soft' : 'text-subtle hover:bg-brand-soft',
                  )}
                >
                  {format(parseLocalDate(d), 'd')}
                </button>
                {dots ? (
                  all > 0 && (
                    <div aria-hidden className="flex flex-wrap gap-1 px-0.5">
                      {cell.tasks.slice(0, 4).map((t) => (
                        <span key={t.id} className={cn('size-2 rounded-full', ACCENT_CLASSES[taskAccent(t.id)].strong)} />
                      ))}
                      {cell.reminders.slice(0, 2).map((r) => (
                        <span key={`${r.reminderId}-${r.at}`} className="size-2 rounded-full bg-brand ring-1 ring-white" />
                      ))}
                    </div>
                  )
                ) : (
                  <ul className="flex min-w-0 flex-col gap-0.5">
                    {visible.map((it) => (
                      <li key={it.key} className="min-w-0">
                        {it.node}
                      </li>
                    ))}
                    {more > 0 && (
                      <li>
                        <button
                          type="button"
                          onClick={() => setDayOpen(d)}
                          className="rounded px-1 text-xs font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                        >
                          + {more} autre{more > 1 ? 's' : ''}
                        </button>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={dayOpen !== null}
        title={dayOpen ? `Détail du jour` : ''}
        onClose={() => setDayOpen(null)}
        footer={
          dayOpen && (
            <>
              <Button
                variant="secondary"
                leftIcon={<Bell className="size-4" aria-hidden />}
                onClick={() => {
                  const d = dayOpen;
                  setDayOpen(null);
                  onCreateReminder(d);
                }}
              >
                Nouveau rappel ce jour
              </Button>
              <Button
                leftIcon={<Plus className="size-4" aria-hidden />}
                onClick={() => {
                  const d = dayOpen;
                  setDayOpen(null);
                  onCreateTask(d);
                }}
              >
                Nouvelle tâche à cette date
              </Button>
            </>
          )
        }
      >
        {dayOpen && detail && (
          <div className="flex flex-col gap-3 pb-2">
            <p className="text-sm font-medium text-muted first-letter:uppercase">{longDate(dayOpen)}</p>
            {detail.tasks.length + detail.reminders.length === 0 ? (
              <p className="rounded-xl border-2 border-dashed border-line px-4 py-6 text-center text-sm text-body">Rien de prévu ce jour.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {detail.reminders.map((r) => (
                  <li key={`r-${r.reminderId}-${r.at}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setDayOpen(null);
                        onSelectReminder(r.reminderId);
                      }}
                      className="flex min-h-11 w-full items-center gap-3 rounded-xl border-l-4 border-brand bg-stage/60 px-3 py-2 text-left text-sm hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      <Bell className="size-4 shrink-0 text-brand" aria-hidden />
                      <span className="min-w-0 flex-1 truncate font-medium text-ink">
                        <span className="sr-only">Rappel : </span>
                        {r.title}
                      </span>
                      <span className="text-xs text-muted">{reminderTime(r)}</span>
                    </button>
                  </li>
                ))}
                {detail.tasks.map((t) => {
                  const a = ACCENT_CLASSES[taskAccent(t.id)];
                  return (
                    <li key={`t-${t.id}`}>
                      <button
                        type="button"
                        onClick={() => {
                          setDayOpen(null);
                          onSelectTask(t.id);
                        }}
                        className={cn(
                          'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                          a.soft,
                        )}
                      >
                        <span className="min-w-0 flex-1 truncate font-medium text-ink">
                          <span className="sr-only">Tâche : </span>
                          {t.title}
                        </span>
                        <span className="text-xs font-medium text-ink">{t.progress} %</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
