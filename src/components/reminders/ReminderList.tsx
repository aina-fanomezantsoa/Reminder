'use client';

import { Bell, Link2, Pencil, Repeat, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/cn';
import { fromEpochMs, parseLocalDate } from '@/domain/dates';
import type { ID, LocalDate, Reminder, ReminderEvent, Task } from '@/domain/types';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { RECURRENCE_LABELS } from './labels';

export interface ReminderListProps {
  upcoming: Reminder[];
  past: Reminder[];
  /** Occurrences manquées non acquittées. */
  missed: ReminderEvent[];
  tasksById: Record<ID, Task>;
  onEdit: (id: ID) => void;
  onDelete: (id: ID) => void;
  onAcknowledge: (eventId: string) => void;
  onOpenTask?: (id: ID) => void;
  onCreate: () => void;
}

type Badge = { label: string; tone: 'fired' | 'missed' };

function DateBlock({ date, muted }: { date: LocalDate; muted?: boolean }) {
  const d = parseLocalDate(date);
  return (
    <div
      className={cn('flex size-16 shrink-0 flex-col items-center justify-center rounded-xl', muted ? 'bg-stage text-muted' : 'bg-brand-soft text-brand')}
      aria-hidden
    >
      <span className="font-display text-2xl font-semibold leading-none">{format(d, 'd')}</span>
      <span className="mt-1 text-xs font-medium first-letter:uppercase">{format(d, 'MMM', { locale: fr })}</span>
    </div>
  );
}

function ReminderItem({
  reminder,
  date,
  time,
  badge,
  muted,
  task,
  onEdit,
  onDelete,
  onOpenTask,
}: {
  reminder: Reminder;
  date: LocalDate;
  time: string;
  badge?: Badge;
  muted?: boolean;
  task?: Task;
  onEdit: (id: ID) => void;
  onDelete: (id: ID) => void;
  onOpenTask?: (id: ID) => void;
}) {
  return (
    <li className="flex flex-wrap items-start gap-x-4 gap-y-2 rounded-2xl bg-surface p-4 shadow-card">
      <DateBlock date={date} muted={muted} />
      <div className="min-w-0 flex-1 basis-40">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="break-words font-display text-base font-semibold text-ink">{reminder.title}</h3>
          {badge && <StateBadge badge={badge} />}
        </div>
        <p className="mt-0.5 text-sm font-medium text-muted">
          <time>{time}</time>
        </p>
        {reminder.note && <p className="mt-1 line-clamp-2 whitespace-pre-wrap break-words text-sm text-body">{reminder.note}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium">
          {reminder.recurrence !== 'none' && (
            <span className="inline-flex items-center gap-1 rounded-md bg-brand-soft px-2 py-1 text-brand">
              <Repeat className="size-3" aria-hidden />
              {RECURRENCE_LABELS[reminder.recurrence]}
            </span>
          )}
          {task && (
            <button
              type="button"
              onClick={() => onOpenTask?.(task.id)}
              className="inline-flex max-w-full items-center gap-1 rounded-md bg-stage px-2 py-1 text-ink hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <Link2 className="size-3 shrink-0" aria-hidden />
              <span className="truncate">Tâche : {task.title}</span>
            </button>
          )}
        </div>
      </div>
      <div className="ml-auto flex shrink-0 gap-1">
        <IconButton label={`Modifier le rappel : ${reminder.title}`} icon={<Pencil className="size-5" />} onClick={() => onEdit(reminder.id)} />
        <IconButton
          label={`Supprimer le rappel : ${reminder.title}`}
          icon={<Trash2 className="size-5" />}
          tone="danger"
          onClick={() => onDelete(reminder.id)}
        />
      </div>
    </li>
  );
}

function StateBadge({ badge }: { badge: Badge }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-md px-2 py-0.5 text-xs font-medium',
        badge.tone === 'fired' ? 'bg-green-100 text-st-done-ink' : 'bg-amber-100 text-amber-900',
      )}
    >
      <span aria-hidden className={cn('size-2 rounded-full', badge.tone === 'fired' ? 'bg-st-done' : 'bg-amber-500')} />
      {badge.label}
    </span>
  );
}

/** Deux sections : À venir (date croissante) et Passés et manqués. */
export function ReminderList({ upcoming, past, missed, tasksById, onEdit, onDelete, onAcknowledge, onOpenTask, onCreate }: ReminderListProps) {
  if (upcoming.length === 0 && past.length === 0 && missed.length === 0) {
    return (
      <EmptyState
        icon={<Bell className="size-7" />}
        title="Aucun rappel"
        description="Créez un rappel pour être prévenu à l'heure dite."
        action={{ label: 'Nouveau rappel', onClick: onCreate }}
      />
    );
  }

  const missedIds = new Set(missed.map((e) => e.reminderId));
  const pastIds = new Set(past.map((r) => r.id));
  // Manqués dont le rappel n'est pas dans « passés » (récurrent encore actif, ou supprimé).
  const orphanMissed = missed.filter((e) => !pastIds.has(e.reminderId));

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="rem-upcoming">
        <h2 id="rem-upcoming" className="mb-3 font-display text-base font-semibold text-ink">
          À venir
        </h2>
        {upcoming.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed border-line px-6 py-6 text-center text-sm text-body">Aucun rappel à venir.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {upcoming.map((r) => {
              const { date } = fromEpochMs(r.nextDueAt ?? 0);
              return (
                <ReminderItem
                  key={r.id}
                  reminder={r}
                  date={date}
                  time={r.time}
                  task={r.taskId ? tasksById[r.taskId] : undefined}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onOpenTask={onOpenTask}
                />
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="rem-past">
        <h2 id="rem-past" className="mb-3 font-display text-base font-semibold text-ink">
          Passés et manqués
        </h2>
        {past.length === 0 && orphanMissed.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed border-line px-6 py-6 text-center text-sm text-body">Aucun rappel passé.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {orphanMissed.map((e) => {
              const { date, time } = fromEpochMs(e.dueAt);
              return (
                <li key={e.id} className="flex items-start gap-4 rounded-2xl bg-surface p-4 shadow-card">
                  <DateBlock date={date} muted />
                  <div className="min-w-0 flex-1 basis-40">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-words font-display text-base font-semibold text-ink">{e.title || 'Rappel supprimé'}</h3>
                      <StateBadge badge={{ label: 'Manqué', tone: 'missed' }} />
                    </div>
                    <p className="mt-0.5 text-sm font-medium text-muted">{time}</p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => onAcknowledge(e.id)} aria-label={`Fermer : ${e.title}`}>
                    Fermer
                  </Button>
                </li>
              );
            })}
            {past.map((r) => {
              const isMissed = missedIds.has(r.id);
              return (
                <ReminderItem
                  key={r.id}
                  reminder={r}
                  date={r.startDate}
                  time={r.time}
                  muted
                  badge={isMissed ? { label: 'Manqué', tone: 'missed' } : { label: `Déclenché à ${r.time}`, tone: 'fired' }}
                  task={r.taskId ? tasksById[r.taskId] : undefined}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onOpenTask={onOpenTask}
                />
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
