'use client';

import { useId, useMemo, useState, type FormEvent } from 'react';
import { Info, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MAX_TITLE } from '@/lib/constants';
import { formatLocalDate, parseLocalDate, todayLocal } from '@/domain/dates';
import type { ID, Recurrence, Reminder, ReminderInput, Result, Task } from '@/domain/types';
import { Button } from '@/components/ui/Button';
import { Field, controlClass } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Segmented } from '@/components/ui/Segmented';
import { useDirtyGuard } from '@/components/ui/useDirtyGuard';
import { RECURRENCE_OPTIONS } from './labels';

export interface ReminderFormProps {
  initial?: Reminder;
  /** Tâche préliée (depuis la fiche tâche). */
  defaultTaskId?: ID;
  /** Date préremplie (depuis le calendrier). */
  defaultDate?: string;
  tasks: Task[];
  onSubmit: (input: ReminderInput) => Promise<Result<Reminder, ReminderInput>>;
  onDelete?: (id: ID) => void;
  onClose: () => void;
}

type FormErrors = Partial<Record<'title' | 'startDate' | 'time' | 'recurrence' | 'taskId' | 'note', string>>;
const FIELD_ORDER = ['title', 'startDate', 'time', 'taskId', 'note'] as const;

/** Heure par défaut : dans 5 minutes. */
function defaultSlot(): { date: string; time: string } {
  const d = new Date(Date.now() + 5 * 60_000);
  return { date: formatLocalDate(d), time: format(d, 'HH:mm') };
}

function recurrenceHelp(recurrence: Recurrence, date: string, time: string): string | null {
  if (recurrence === 'none' || !date || !time) return null;
  let d: Date;
  try {
    d = parseLocalDate(date);
  } catch {
    return null;
  }
  if (recurrence === 'daily') return `Tous les jours à ${time}`;
  if (recurrence === 'weekly') return `Chaque ${format(d, 'EEEE', { locale: fr })} à ${time}`;
  const day = d.getDate();
  return day > 28 ? `Le ${day} de chaque mois (le dernier jour des mois plus courts), à ${time}` : `Le ${day === 1 ? '1er' : day} de chaque mois à ${time}`;
}

export function ReminderForm({ initial: liveInitial, defaultTaskId, defaultDate, tasks, onSubmit, onDelete, onClose }: ReminderFormProps) {
  const uid = useId().replace(/:/g, '');
  const fid = (n: string) => `rf-${uid}-${n}`;
  // Instantané : les mises à jour réactives du rappel ne doivent pas fausser la détection de modification.
  const [initial] = useState(liveInitial);
  const start = useMemo(() => defaultSlot(), []);

  const initialValues = useMemo(
    () => ({
      title: initial?.title ?? '',
      startDate: initial?.startDate ?? defaultDate ?? start.date,
      time: initial?.time ?? (defaultDate && defaultDate !== todayLocal() ? '09:00' : start.time),
      recurrence: (initial?.recurrence ?? 'none') as Recurrence,
      taskId: initial?.taskId ?? defaultTaskId ?? '',
      note: initial?.note ?? '',
    }),
    [initial, defaultDate, defaultTaskId, start],
  );

  const [title, setTitle] = useState(initialValues.title);
  const [startDate, setStartDate] = useState(initialValues.startDate);
  const [time, setTime] = useState(initialValues.time);
  const [recurrence, setRecurrence] = useState<Recurrence>(initialValues.recurrence);
  const [taskId, setTaskId] = useState(initialValues.taskId);
  const [note, setNote] = useState(initialValues.note);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const dirty =
    title !== initialValues.title ||
    startDate !== initialValues.startDate ||
    time !== initialValues.time ||
    recurrence !== initialValues.recurrence ||
    taskId !== initialValues.taskId ||
    note !== initialValues.note;
  const { requestClose, dialog } = useDirtyGuard(dirty && !submitting, onClose);

  const errorCount = Object.values(errors).filter(Boolean).length;
  const focusFirst = (errs: FormErrors) => {
    const first = FIELD_ORDER.find((k) => errs[k]);
    if (first) requestAnimationFrame(() => document.getElementById(fid(first))?.focus());
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const local: FormErrors = {};
    if (!title.trim()) local.title = 'Le titre est obligatoire.';
    if (!startDate) local.startDate = 'La date est obligatoire.';
    if (!time) local.time = "L'heure est obligatoire.";
    if (Object.keys(local).length) {
      setErrors(local);
      focusFirst(local);
      return;
    }
    setSubmitting(true);
    try {
      const input: ReminderInput = { title, startDate, time, recurrence, ...(taskId ? { taskId } : {}), ...(note.trim() ? { note } : {}) };
      const res = await onSubmit(input);
      if (res.ok) {
        onClose();
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
  const help = recurrenceHelp(recurrence, startDate, time);

  return (
    <>
      <Modal
        open
        title={initial ? 'Modifier le rappel' : 'Nouveau rappel'}
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
          <div role="status" aria-live="polite" className="sr-only">
            {errorCount > 0 ? `${errorCount} erreur${errorCount > 1 ? 's' : ''} dans le formulaire.` : ''}
          </div>

          {initial && initial.recurrence !== 'none' && (
            <p className="flex items-start gap-2 rounded-xl bg-brand-soft px-4 py-3 text-sm text-body">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              Les changements s&apos;appliquent à toute la série.
            </p>
          )}

          <Field
            label="Titre"
            htmlFor={fid('title')}
            required
            error={errors.title}
            hint={title.length >= 180 ? `${title.length} / ${MAX_TITLE} caractères` : undefined}
          >
            <input
              type="text"
              value={title}
              data-autofocus
              autoComplete="off"
              onChange={(e) => setTitle(e.target.value)}
              className={controlClass(Boolean(errors.title))}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date" htmlFor={fid('startDate')} required error={errors.startDate}>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={controlClass(Boolean(errors.startDate))} />
            </Field>
            <Field label="Heure" htmlFor={fid('time')} required error={errors.time}>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={controlClass(Boolean(errors.time))} />
            </Field>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink">Répétition</span>
            <Segmented ariaLabel="Répétition" value={recurrence} onChange={setRecurrence} options={RECURRENCE_OPTIONS} />
            {help && (
              <p aria-live="polite" className="text-xs text-subtle">
                {help}
              </p>
            )}
          </div>

          <Field label="Tâche liée (facultatif)" htmlFor={fid('taskId')} error={errors.taskId}>
            <select value={taskId} onChange={(e) => setTaskId(e.target.value)} className={controlClass(Boolean(errors.taskId))}>
              <option value="">Aucune tâche</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
              {taskId && !tasks.some((t) => t.id === taskId) && <option value={taskId}>Tâche introuvable</option>}
            </select>
          </Field>

          <Field label="Note (facultatif)" htmlFor={fid('note')} error={errors.note}>
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={controlClass(Boolean(errors.note))} />
          </Field>
        </form>
      </Modal>
      {dialog}
    </>
  );
}
