'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, ChevronLeft, ChevronRight, Clock, Pencil, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ACCENT_CLASSES, taskAccent } from '@/lib/accent';
import { weekdayShortDate } from '@/lib/format';
import { addDaysLocal } from '@/domain/dates';
import { slotsOverlap } from '@/domain/slots';
import type { ID, LocalDate, PlanSlot, PlanSlotResult, Result, SlotInput, Task } from '@/domain/types';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { SlotForm } from './SlotForm';

export interface PlanDayPanelProps {
  date: LocalDate;
  today: LocalDate;
  /** `undefined` pendant le chargement. */
  slots: PlanSlot[] | undefined;
  tasks: Task[];
  onCreate: (input: SlotInput) => Promise<Result<PlanSlotResult, SlotInput>>;
  onUpdate: (id: ID, input: SlotInput) => Promise<Result<PlanSlotResult, SlotInput>>;
  onRemove: (id: ID) => void | Promise<unknown>;
  onDateChange?: (date: LocalDate) => void;
}

type FormState = { mode: 'create' } | { mode: 'edit'; slot: PlanSlot } | null;

/** Plan du jour : créneaux triés, avertissement de chevauchement, ajout / modification / suppression. */
export function PlanDayPanel({ date, today, slots, tasks, onCreate, onUpdate, onRemove, onDateChange }: PlanDayPanelProps) {
  const [form, setForm] = useState<FormState>(null);
  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const overlapsOf = useMemo(() => {
    const map = new Map<ID, PlanSlot[]>();
    for (const s of slots ?? []) map.set(s.id, (slots ?? []).filter((o) => o.id !== s.id && slotsOverlap(s, o)));
    return map;
  }, [slots]);

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

      {slots === undefined ? (
        <div aria-busy="true" className="flex flex-col gap-2">
          <Skeleton variant="row" />
          <Skeleton variant="row" />
        </div>
      ) : slots.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-xl bg-surface p-4 text-sm text-body shadow-card">
          <p className="flex items-center gap-3">
            <CalendarClock className="size-5 shrink-0 text-brand" aria-hidden />
            {isToday ? 'Rien de prévu aujourd’hui' : 'Rien de prévu ce jour'}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {slots.map((s) => {
            const task = s.taskId ? tasksById.get(s.taskId) : undefined;
            const accent = task ? ACCENT_CLASSES[taskAccent(task.id)] : null;
            const overlaps = overlapsOf.get(s.id) ?? [];
            return (
              <li key={s.id} className="group relative flex items-center gap-3 overflow-hidden rounded-xl bg-surface py-3 pl-3 pr-4 shadow-card">
                {task ? (
                  <Avatar label={task.title} accent={taskAccent(task.id)} size="md" />
                ) : (
                  <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-stage text-muted">
                    <Clock className="size-4" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">
                    <time>{s.start}</time> - <time>{s.end}</time>
                  </p>
                  <p className="truncate text-xs text-muted" title={s.title}>
                    {s.title}
                  </p>
                  {overlaps.length > 0 && (
                    <p className="mt-1 flex items-start gap-1 text-xs font-medium text-amber-800">
                      <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden />
                      Chevauche {overlaps.map((o) => `${o.start} - ${o.end}`).join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 opacity-100 transition group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none md:opacity-0">
                  <IconButton label={`Modifier le créneau ${s.start} - ${s.end}`} icon={<Pencil className="size-4" />} onClick={() => setForm({ mode: 'edit', slot: s })} />
                  <IconButton label={`Supprimer le créneau ${s.start} - ${s.end}`} icon={<Trash2 className="size-4" />} tone="danger" onClick={() => void onRemove(s.id)} />
                </div>
                <span aria-hidden className={cn('absolute inset-y-0 right-0 w-1', accent ? accent.strong : 'bg-st-draft')} />
              </li>
            );
          })}
        </ul>
      )}

      <Button variant="secondary" size="md" leftIcon={<Plus className="size-4" aria-hidden />} onClick={() => setForm({ mode: 'create' })} className="self-start">
        Créneau
      </Button>

      {form && (
        <SlotForm
          key={form.mode === 'edit' ? form.slot.id : 'create'}
          date={date}
          initial={form.mode === 'edit' ? form.slot : undefined}
          tasks={tasks}
          onSubmit={(input) => (form.mode === 'edit' ? onUpdate(form.slot.id, input) : onCreate(input))}
          onDelete={(id) => {
            void onRemove(id);
            setForm(null);
          }}
          onCancel={() => setForm(null)}
        />
      )}
    </div>
  );
}
