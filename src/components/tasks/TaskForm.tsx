'use client';

import { useId, useState, type FormEvent } from 'react';
import { Bell, ChevronDown, Trash2 } from 'lucide-react';
import { STATUS_LABELS, STATUS_STYLES, MAX_TITLE } from '@/lib/constants';
import { addDaysLocal, todayLocal } from '@/domain/dates';
import { subtaskProgress } from '@/domain/task-rules';
import { useTaskComments, useTaskReminders } from '@/data/hooks';
import { taskService } from '@/data/services/tasks';
import { TASK_STATUSES, type ID, type Result, type Task, type TaskCardData, type TaskInput, type TaskStatus } from '@/domain/types';
import { Button } from '@/components/ui/Button';
import { Field, controlClass } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Segmented } from '@/components/ui/Segmented';
import { useDirtyGuard } from '@/components/ui/useDirtyGuard';
import { StarButton } from '@/components/ui/StarButton';
import { SubtaskList } from './SubtaskList';
import { shortDate } from '@/lib/format';

export interface TaskFormProps {
  mode: 'create' | 'edit';
  initial?: TaskCardData;
  defaultStatus?: TaskStatus;
  /** Date de début préremplie (création depuis le calendrier). */
  defaultDate?: string;
  onSubmit: (input: TaskInput) => Promise<Result<Task, TaskInput>>;
  onDelete?: (id: ID) => void;
  onClose: () => void;
  /** Ouvre le formulaire de rappel avec la tâche préliée (écran Rappels, vague 3). */
  onAddReminder?: (taskId: ID) => void;
}

type FormErrors = Partial<Record<'title' | 'startDate' | 'endDate' | 'status' | 'progress', string>>;
const FIELD_ORDER = ['title', 'startDate', 'endDate', 'progress'] as const;
const PROGRESS_ERROR = 'La progression doit être un entier entre 0 et 100.';

export function TaskForm({ mode, initial: liveInitial, defaultStatus, defaultDate, onSubmit, onDelete, onClose, onAddReminder }: TaskFormProps) {
  const uid = useId().replace(/:/g, '');
  const fid = (n: string) => `tf-${uid}-${n}`;
  // Instantané : les mises à jour réactives de la tâche ne doivent pas fausser la détection de modification.
  const [initial] = useState(liveInitial);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [startDate, setStartDate] = useState(initial?.startDate ?? defaultDate ?? todayLocal());
  const [endDate, setEndDate] = useState(initial?.endDate ?? addDaysLocal(defaultDate ?? todayLocal(), 6));
  const [status, setStatus] = useState<TaskStatus>(initial?.status ?? defaultStatus ?? 'draft');
  const [progress, setProgress] = useState(String(initial?.progress ?? (defaultStatus === 'done' ? 100 : 0)));
  const [starred, setStarred] = useState(initial?.starred ?? false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [snap] = useState(() => ({ title, startDate, endDate, status, progress, starred }));
  const dirty = title !== snap.title || startDate !== snap.startDate || endDate !== snap.endDate || status !== snap.status || progress !== snap.progress || starred !== snap.starred;
  const { requestClose, dialog } = useDirtyGuard(dirty && !submitting, onClose);

  const isDone = status === 'done';
  const hasSubtasks = (liveInitial?.subtasks.length ?? 0) > 0;
  const auto = isDone || hasSubtasks;
  const progressValue = isDone ? 100 : hasSubtasks ? subtaskProgress(liveInitial!.subtasks) : Number(progress);
  const progressValid = auto || (progress.trim() !== '' && Number.isInteger(progressValue) && progressValue >= 0 && progressValue <= 100);
  const errorCount = Object.values(errors).filter(Boolean).length;

  const focusFirst = (errs: FormErrors) => {
    const first = FIELD_ORDER.find((k) => errs[k]);
    if (first) requestAnimationFrame(() => document.getElementById(fid(first))?.focus());
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!progressValid) {
      const errs = { progress: PROGRESS_ERROR };
      setErrors(errs);
      focusFirst(errs);
      return;
    }
    setSubmitting(true);
    const input: TaskInput = { title, startDate, endDate, status, progress: progressValue, starred };
    try {
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
  const taskId = initial?.id;

  return (
    <>
    <Modal
      open
      size="lg"
      title={mode === 'create' ? 'Nouvelle tâche' : 'Modifier la tâche'}
      onClose={requestClose}
      footer={
        <>
          {mode === 'edit' && onDelete && taskId && (
            <Button variant="danger" size="md" leftIcon={<Trash2 className="size-4" aria-hidden />} onClick={() => onDelete(taskId)} className="mr-auto">
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

        <Field label="Titre" htmlFor={fid('title')} required error={errors.title} hint={title.length >= 180 ? `${title.length} / ${MAX_TITLE} caractères` : undefined}>
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
          <Field label="Début" htmlFor={fid('startDate')} required error={errors.startDate}>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={controlClass(Boolean(errors.startDate))} />
          </Field>
          <Field label="Fin" htmlFor={fid('endDate')} required error={errors.endDate}>
            <input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} className={controlClass(Boolean(errors.endDate))} />
          </Field>
        </div>

        <div className="flex flex-col gap-2">
          <span id={fid('status-label')} className="text-sm font-medium text-ink">
            Statut
          </span>
          <Segmented
            ariaLabel="Statut"
            value={status}
            onChange={setStatus}
            options={TASK_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s], dot: STATUS_STYLES[s].dot }))}
          />
        </div>

        <div className="flex flex-col gap-3">
          <div className="grid items-start gap-4 sm:grid-cols-[1fr_7rem]">
            <Field
              label="Progression"
              htmlFor={fid('progress-range')}
              hint={isDone ? 'Une tâche terminée est à 100 %.' : hasSubtasks ? 'Calculée selon les sous-tâches cochées.' : undefined}
              className="min-w-0"
            >
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                disabled={auto}
                value={progressValid ? progressValue : 0}
                onChange={(e) => setProgress(e.target.value)}
                className="h-11 w-full accent-brand"
              />
            </Field>
            <Field label="En %" htmlFor={fid('progress')} error={errors.progress}>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                step={1}
                disabled={auto}
                value={auto ? String(progressValue) : progress}
                onChange={(e) => setProgress(e.target.value)}
                className={controlClass(Boolean(errors.progress))}
              />
            </Field>
          </div>
          <ProgressBar value={progressValid ? progressValue : 0} />
        </div>

        <StarButton active={starred} onToggle={() => setStarred((v) => !v)} label="Marquer comme favori" showLabel className="self-start" />
      </form>

      {mode === 'edit' && liveInitial && <EditSections task={liveInitial} onAddReminder={onAddReminder} />}
    </Modal>
    {dialog}
    </>
  );
}

function Section({ title, children, defaultOpen }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group rounded-2xl bg-stage/60 p-4">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-xl font-display text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
        {title}
        <ChevronDown className="size-4 transition group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

function EditSections({ task, onAddReminder }: { task: TaskCardData; onAddReminder?: (taskId: ID) => void }) {
  const comments = useTaskComments(task.id);
  const reminders = useTaskReminders(task.id);
  const [text, setText] = useState('');
  const [commentError, setCommentError] = useState<string>();
  const done = task.subtasks.filter((s) => s.done).length;

  const addComment = async () => {
    const res = await taskService.addComment(task.id, text);
    if (res.ok) {
      setText('');
      setCommentError(undefined);
    } else setCommentError(res.errors.text ?? 'Le commentaire ne peut pas être vide.');
  };

  return (
    <div className="mt-6 flex flex-col gap-3">
      <Section title={`Sous-tâches (${done}/${task.subtasks.length})`} defaultOpen>
        <SubtaskList
          taskId={task.id}
          subtasks={task.subtasks}
          onAdd={(t) => taskService.addSubtask(task.id, t)}
          onRename={(id, t) => taskService.renameSubtask(id, t)}
          onToggle={(id) => taskService.toggleSubtask(id)}
          onRemove={(id) => taskService.removeSubtask(id)}
        />
      </Section>

      <Section title={`Commentaires (${comments?.length ?? task.commentCount})`}>
        <ul className="mb-3 flex flex-col gap-2">
          {comments?.length === 0 && <li className="text-sm text-subtle">Aucun commentaire.</li>}
          {comments?.map((c) => (
            <li key={c.id} className="rounded-xl bg-surface px-4 py-2 text-sm text-ink">
              <p className="whitespace-pre-wrap break-words">{c.text}</p>
              <p className="mt-1 text-xs text-subtle">{new Date(c.createdAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</p>
            </li>
          ))}
        </ul>
        <Field label="Ajouter un commentaire" htmlFor={`comment-${task.id}`} error={commentError}>
          <textarea
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={controlClass(Boolean(commentError))}
          />
        </Field>
        <Button variant="secondary" size="sm" className="mt-2" onClick={() => void addComment()}>
          Commenter
        </Button>
      </Section>

      <Section title={`Rappels liés (${reminders?.length ?? 0})`}>
        <ul className="mb-3 flex flex-col gap-2">
          {reminders?.length === 0 && <li className="text-sm text-subtle">Aucun rappel lié.</li>}
          {reminders?.map((r) => (
            <li key={r.id} className="flex items-center gap-2 rounded-xl bg-surface px-4 py-2 text-sm text-ink">
              <Bell className="size-4 text-brand" aria-hidden />
              <span className="flex-1 truncate font-medium">{r.title}</span>
              <span className="text-xs text-subtle">
                {shortDate(r.startDate)} · {r.time}
              </span>
            </li>
          ))}
        </ul>
        {onAddReminder && (
          <Button variant="secondary" size="sm" leftIcon={<Bell className="size-4" aria-hidden />} onClick={() => onAddReminder(task.id)}>
            Ajouter un rappel
          </Button>
        )}
      </Section>
    </div>
  );
}
