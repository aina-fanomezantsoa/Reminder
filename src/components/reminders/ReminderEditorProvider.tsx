'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useReminders, useTasks } from '@/data/hooks';
import { reminderService } from '@/data/services/reminders';
import { fromEpochMs } from '@/domain/dates';
import { REMINDER_FIRED_EVENT, type ID, type LocalDate, type ReminderFiredDetail, type ReminderInput, type Result, type Reminder } from '@/domain/types';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { getPermission } from '@/notifications/permission';
import { ReminderForm } from './ReminderForm';

export interface ReminderCreateOptions {
  taskId?: ID;
  date?: LocalDate;
}
interface ReminderEditorApi {
  openCreate: (opts?: ReminderCreateOptions) => void;
  openEdit: (id: ID) => void;
  requestDelete: (id: ID) => void;
}

const Ctx = createContext<ReminderEditorApi | null>(null);

export function useReminderEditor(): ReminderEditorApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useReminderEditor doit être utilisé dans <ReminderEditorProvider>.');
  return ctx;
}

type EditorState = { mode: 'create'; opts: ReminderCreateOptions } | { mode: 'edit'; id: ID } | null;

const STORAGE_ERROR = 'Enregistrement impossible : espace de stockage insuffisant ou refusé.';

/**
 * Héberge le formulaire de rappel et la confirmation de suppression (ouvrables depuis tout écran),
 * et affiche le toast in-app quand le scheduler déclenche un rappel (REMINDER_FIRED_EVENT).
 */
export function ReminderEditorProvider({ children }: { children: ReactNode }) {
  const lists = useReminders();
  const tasks = useTasks();
  const toast = useToast();
  const router = useRouter();
  const [editor, setEditor] = useState<EditorState>(null);
  const [deleteId, setDeleteId] = useState<ID | null>(null);
  // Lecture ponctuelle du rappel édité (il peut avoir disparu de `upcoming`/`past` si l'événement l'a déplacé).
  const [loadedState, setLoadedState] = useState<{ id: ID; reminder: Reminder | null } | null>(null);

  const all = useMemo(() => (lists ? [...lists.upcoming, ...lists.past] : []), [lists]);
  const editingId = editor?.mode === 'edit' ? editor.id : null;
  const loaded = loadedState && loadedState.id === editingId ? loadedState.reminder : undefined;
  const editingLive = editingId ? all.find((r) => r.id === editingId) : undefined;

  useEffect(() => {
    if (!editingId) return;
    let cancelled = false;
    reminderService
      .get(editingId)
      .then((r) => !cancelled && setLoadedState({ id: editingId, reminder: r ?? null }))
      .catch(() => !cancelled && setLoadedState({ id: editingId, reminder: null }));
    return () => {
      cancelled = true;
    };
  }, [editingId]);

  const api = useMemo<ReminderEditorApi>(
    () => ({
      openCreate: (opts = {}) => setEditor({ mode: 'create', opts }),
      openEdit: (id) => setEditor({ mode: 'edit', id }),
      requestDelete: (id) => setDeleteId(id),
    }),
    [],
  );

  // Toast in-app à l'heure du rappel (repli quand la permission est refusée, confirmation sinon).
  const showFired = useCallback(
    (d: ReminderFiredDetail) => {
      const granted = getPermission() === 'granted';
      toast.push({
        tone: 'info',
        message: `Rappel : ${d.title} · ${fromEpochMs(d.dueAt).time}`,
        duration: granted ? 10_000 : 0,
        action: { label: 'Voir', onClick: () => router.push('/reminders') },
      });
    },
    [toast, router],
  );
  useEffect(() => {
    const handler = (e: Event) => showFired((e as CustomEvent<ReminderFiredDetail>).detail);
    window.addEventListener(REMINDER_FIRED_EVENT, handler);
    return () => window.removeEventListener(REMINDER_FIRED_EVENT, handler);
  }, [showFired]);

  const submit = async (input: ReminderInput): Promise<Result<Reminder, ReminderInput>> => {
    try {
      if (editor?.mode === 'edit') {
        const res = await reminderService.update(editor.id, input);
        if (res.ok) toast.push({ message: 'Rappel enregistré' });
        return res;
      }
      const res = await reminderService.create(input);
      if (res.ok) toast.push({ message: 'Rappel créé' });
      return res;
    } catch {
      toast.push({ tone: 'error', message: STORAGE_ERROR });
      return { ok: false, errors: {} };
    }
  };

  const confirmDelete = async () => {
    const id = deleteId;
    setDeleteId(null);
    if (!id) return;
    try {
      await reminderService.remove(id);
      setEditor((e) => (e?.mode === 'edit' && e.id === id ? null : e));
      toast.push({ message: 'Rappel supprimé' });
    } catch {
      toast.push({ tone: 'error', message: 'Suppression impossible. Réessayez.' });
    }
  };

  const deleting = deleteId ? (all.find((r) => r.id === deleteId) ?? (editingId === deleteId ? (loaded ?? undefined) : undefined)) : undefined;
  const editing = editingLive ?? loaded ?? undefined;

  return (
    <Ctx.Provider value={api}>
      {children}
      {editor?.mode === 'create' && (
        <ReminderForm
          key="create"
          defaultTaskId={editor.opts.taskId}
          defaultDate={editor.opts.date}
          tasks={tasks ?? []}
          onSubmit={submit}
          onClose={() => setEditor(null)}
        />
      )}
      {editor?.mode === 'edit' && editing && (
        <ReminderForm key={editor.id} initial={editing} tasks={tasks ?? []} onSubmit={submit} onDelete={api.requestDelete} onClose={() => setEditor(null)} />
      )}
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Supprimer ce rappel ?"
        confirmLabel="Supprimer"
        tone="danger"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void confirmDelete()}
        description={
          <>
            {deleting && <p className="mb-2 font-medium text-ink">{deleting.title}</p>}
            <p>S&apos;il est récurrent, toute la série sera supprimée. Cette action est irréversible.</p>
          </>
        }
      />
    </Ctx.Provider>
  );
}
