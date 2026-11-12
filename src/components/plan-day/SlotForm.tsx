'use client';

import { useId, useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { MAX_TITLE } from '@/lib/constants';
import { longDate } from '@/lib/format';
import type { ID, LocalDate, PlanSlot, PlanSlotResult, Result, SlotInput, Task } from '@/domain/types';
import { Button } from '@/components/ui/Button';
import { Field, controlClass } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useDirtyGuard } from '@/components/ui/useDirtyGuard';

export interface SlotFormProps {
  date: LocalDate;
  initial?: PlanSlot;
  tasks: Task[];
  onSubmit: (input: SlotInput) => Promise<Result<PlanSlotResult, SlotInput>>;
  onDelete?: (id: ID) => void;
  onCancel: () => void;
}

type FormErrors = Partial<Record<'title' | 'start' | 'end' | 'taskId' | 'date', string>>;
const FIELD_ORDER = ['title', 'start', 'end', 'taskId'] as const;

/** Prochaine heure pleine, bornée à 22:00 pour garder un créneau d'une heure dans la journée. */
function defaultStart(): string {
  const h = Math.min(new Date().getHours() + 1, 22);
  return `${String(h).padStart(2, '0')}:00`;
}
function plusOneHour(start: string): string {
  const [h, m] = start.split(':').map(Number);
  if (h >= 23) return '23:59';
  return `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function SlotForm({ date, initial: liveInitial, tasks, onSubmit, onDelete, onCancel }: SlotFormProps) {
  const uid = useId().replace(/:/g, '');
  const fid = (n: string) => `sf-${uid}-${n}`;
  const [initial] = useState(liveInitial);
  const [init] = useState(() => {
    const start = initial?.start ?? defaultStart();
    return { title: initial?.title ?? '', start, end: initial?.end ?? plusOneHour(start), taskId: initial?.taskId ?? '' };
  });

  const [title, setTitle] = useState(init.title);
  const [start, setStart] = useState(init.start);
  const [end, setEnd] = useState(init.end);
  const [taskId, setTaskId] = useState(init.taskId);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const dirty = title !== init.title || start !== init.start || end !== init.end || taskId !== init.taskId;
  const { requestClose, dialog } = useDirtyGuard(dirty && !submitting, onCancel);

  const focusFirst = (errs: FormErrors) => {
    const first = FIELD_ORDER.find((k) => errs[k]);
    if (first) requestAnimationFrame(() => document.getElementById(fid(first))?.focus());
  };

  const pickTask = (id: string) => {
    setTaskId(id);
    const t = tasks.find((x) => x.id === id);
    if (t && !title.trim()) setTitle(t.title);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const local: FormErrors = {};
    if (!title.trim()) local.title = 'Le titre est obligatoire.';
    if (!start) local.start = "L'heure de début est obligatoire.";
    if (!end) local.end = "L'heure de fin est obligatoire.";
    else if (start && end <= start) local.end = "L'heure de fin doit être postérieure à l'heure de début.";
    if (Object.keys(local).length) {
      setErrors(local);
      focusFirst(local);
      return;
    }
    setSubmitting(true);
    try {
      const res = await onSubmit({ date, start, end, title, ...(taskId ? { taskId } : {}) });
      if (res.ok) {
        onCancel();
        return;
      }
      const errs = res.errors as FormErrors;
      setErrors(errs);
      focusFirst(errs);
    } finally {
      setSubmitting(false);
    }
  };

  const formId = fid('form');
  return (
    <>
      <Modal
        open
        title={initial ? 'Modifier le créneau' : 'Nouveau créneau'}
        onClose={requestClose}
        footer={
          <>
            {initial && onDelete && (
              <Button variant="danger" leftIcon={<Trash2 className="size-4" aria-hidden />} onClick={() => onDelete(initial.id)} className="mr-auto">
                Supprimer
              </Button>
            )}
            <Button variant="secondary" onClick={requestClose}>
              Annuler
            </Button>
            <Button type="submit" form={formId} loading={submitting}>
              Enregistrer
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-5 pt-2">
          <p className="text-sm font-medium text-muted first-letter:uppercase">{longDate(date)}</p>
          {errors.date && <p className="text-xs font-medium text-red-700">{errors.date}</p>}

          <Field label="Tâche liée (facultatif)" htmlFor={fid('taskId')} error={errors.taskId}>
            <select value={taskId} onChange={(e) => pickTask(e.target.value)} className={controlClass(Boolean(errors.taskId))}>
              <option value="">Créneau libre</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Titre" htmlFor={fid('title')} required error={errors.title} hint={title.length >= 180 ? `${title.length} / ${MAX_TITLE} caractères` : undefined}>
            <input type="text" value={title} data-autofocus autoComplete="off" onChange={(e) => setTitle(e.target.value)} className={controlClass(Boolean(errors.title))} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Début" htmlFor={fid('start')} required error={errors.start}>
              <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={controlClass(Boolean(errors.start))} />
            </Field>
            <Field label="Fin" htmlFor={fid('end')} required error={errors.end}>
              <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={controlClass(Boolean(errors.end))} />
            </Field>
          </div>
        </form>
      </Modal>
      {dialog}
    </>
  );
}
