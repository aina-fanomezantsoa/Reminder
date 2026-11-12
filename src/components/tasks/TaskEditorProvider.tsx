'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useTaskBoard } from '@/data/hooks';
import { taskService } from '@/data/services/tasks';
import { TASK_STATUSES, type ID, type LocalDate, type TaskCardData, type Result, type Task, type TaskInput, type TaskStatus } from '@/domain/types';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { useReminderEditor } from '@/components/reminders/ReminderEditorProvider';
import { TaskForm } from './TaskForm';

interface TaskEditorApi {
  /** `options.date` : date de début préremplie (ex. depuis le calendrier). */
  openCreate: (defaultStatus?: TaskStatus, options?: { date?: LocalDate }) => void;
  openEdit: (id: ID) => void;
  requestDelete: (id: ID) => void;
}

const Ctx = createContext<TaskEditorApi | null>(null);

export function useTaskEditor(): TaskEditorApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTaskEditor doit être utilisé dans <TaskEditorProvider>.');
  return ctx;
}

type EditorState = { mode: 'create'; defaultStatus?: TaskStatus; date?: LocalDate } | { mode: 'edit'; id: ID } | null;

/** Héberge le formulaire de tâche et la confirmation de suppression, ouvrables depuis n'importe quel écran. */
export function TaskEditorProvider({ children }: { children: ReactNode }) {
  const board = useTaskBoard();
  const toast = useToast();
  const reminders = useReminderEditor();
  const [editor, setEditor] = useState<EditorState>(null);
  const [deleteId, setDeleteId] = useState<ID | null>(null);

  const all = useMemo<TaskCardData[]>(() => (board ? TASK_STATUSES.flatMap((s) => board[s]) : []), [board]);
  const find = useCallback((id: ID | null) => (id ? all.find((t) => t.id === id) : undefined), [all]);

  const api = useMemo<TaskEditorApi>(
    () => ({
      openCreate: (defaultStatus, options) => setEditor({ mode: 'create', defaultStatus, date: options?.date }),
      openEdit: (id) => setEditor({ mode: 'edit', id }),
      requestDelete: (id) => setDeleteId(id),
    }),
    [],
  );

  const editing = editor?.mode === 'edit' ? find(editor.id) : undefined;
  const deleting = find(deleteId);

  const submit = async (input: TaskInput): Promise<Result<Task, TaskInput>> => {
    try {
      if (editor?.mode === 'edit') {
        const res = await taskService.update(editor.id, input);
        if (res.ok) toast.push({ message: 'Tâche enregistrée' });
        return res;
      }
      const res = await taskService.create(input);
      if (res.ok) toast.push({ message: 'Tâche créée' });
      return res;
    } catch {
      toast.push({ tone: 'error', message: 'Enregistrement impossible : espace de stockage insuffisant ou refusé.' });
      return { ok: false, errors: {} };
    }
  };

  const confirmDelete = async () => {
    const id = deleteId;
    setDeleteId(null);
    if (!id) return;
    try {
      await taskService.remove(id);
      setEditor((e) => (e?.mode === 'edit' && e.id === id ? null : e));
      toast.push({ message: 'Tâche supprimée' });
    } catch {
      toast.push({ tone: 'error', message: 'Suppression impossible. Réessayez.' });
    }
  };

  return (
    <Ctx.Provider value={api}>
      {children}
      {editor?.mode === 'create' && (
        <TaskForm key="create" mode="create" defaultStatus={editor.defaultStatus} defaultDate={editor.date} onSubmit={submit} onClose={() => setEditor(null)} />
      )}
      {editor?.mode === 'edit' && editing && (
        <TaskForm key={editor.id} mode="edit" initial={editing} onSubmit={submit} onDelete={api.requestDelete} onAddReminder={(taskId) => reminders.openCreate({ taskId })} onClose={() => setEditor(null)} />
      )}
      <DeleteDialog task={deleting} onCancel={() => setDeleteId(null)} onConfirm={() => void confirmDelete()} />
    </Ctx.Provider>
  );
}

function DeleteDialog({ task, onCancel, onConfirm }: { task?: TaskCardData; onCancel: () => void; onConfirm: () => void }) {
  const n = task?.subtasks.length ?? 0;
  return (
    <ConfirmDialog
      open={Boolean(task)}
      title="Supprimer cette tâche ?"
      confirmLabel="Supprimer"
      tone="danger"
      onCancel={onCancel}
      onConfirm={onConfirm}
      description={
        <>
          {task && <p className="mb-2 font-medium text-ink">{task.title}</p>}
          <p>
            {n > 0 ? `Les ${n} sous-tâche${n > 1 ? 's' : ''} seront supprimée${n > 1 ? 's' : ''} avec elle. ` : ''}
            Les rappels liés sont conservés mais ne seront plus rattachés à une tâche. Cette action est irréversible.
          </p>
        </>
      }
    />
  );
}
