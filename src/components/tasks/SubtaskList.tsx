'use client';

import { useRef, useState } from 'react';
import { AlertCircle, Check, Circle, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ACCENT_CLASSES, taskAccent } from '@/lib/accent';
import type { ID, Result, Subtask } from '@/domain/types';
import { IconButton } from '@/components/ui/IconButton';
import { controlClass } from '@/components/ui/Field';

type TitleResult = Result<Subtask, { title: string }>;

export interface SubtaskListProps {
  taskId: ID;
  subtasks: Subtask[];
  onAdd: (title: string) => Promise<TitleResult>;
  onRename: (id: ID, title: string) => Promise<TitleResult>;
  onToggle: (id: ID) => void | Promise<unknown>;
  onRemove: (id: ID) => void | Promise<unknown>;
}

export function SubtaskList({ taskId, subtasks, onAdd, onRename, onToggle, onRemove }: SubtaskListProps) {
  const accent = ACCENT_CLASSES[taskAccent(taskId)];
  const adding = useRef(false);
  const [draft, setDraft] = useState('');
  const [addError, setAddError] = useState<string>();
  const [editingId, setEditingId] = useState<ID | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editError, setEditError] = useState<string>();

  const add = async () => {
    if (adding.current) return;
    adding.current = true;
    const value = draft;
    setDraft('');
    try {
      const res = await onAdd(value);
      if (res.ok) setAddError(undefined);
      else {
        setDraft(value);
        setAddError(res.errors.title ?? 'La sous-tâche ne peut pas être vide.');
      }
    } finally {
      adding.current = false;
    }
  };

  const commitRename = async (id: ID) => {
    const res = await onRename(id, editValue);
    if (res.ok) {
      setEditingId(null);
      setEditError(undefined);
    } else setEditError(res.errors.title ?? 'La sous-tâche ne peut pas être vide.');
  };

  return (
    <div className="flex flex-col gap-2">
      {subtasks.length === 0 && <p className="text-sm text-subtle">Aucune sous-tâche.</p>}
      <ul className="flex flex-col gap-2">
        {subtasks.map((s) => (
          <li key={s.id} className={cn('flex items-center gap-1 rounded-xl border-l-4 bg-canvas pr-1', accent.border)}>
            <button
              type="button"
              role="checkbox"
              aria-checked={s.done}
              aria-label={`Terminée : ${s.title}`}
              onClick={() => void onToggle(s.id)}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {s.done ? <Check className="size-5 text-st-done-ink" aria-hidden /> : <Circle className="size-5 text-subtle" aria-hidden />}
            </button>
            {editingId === s.id ? (
              <form
                className="flex min-w-0 flex-1 flex-col gap-1 py-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  void commitRename(s.id);
                }}
              >
                <input
                  autoFocus
                  aria-label="Nouveau titre de la sous-tâche"
                  aria-invalid={editError ? true : undefined}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.stopPropagation();
                      setEditingId(null);
                    }
                  }}
                  onBlur={() => {
                    if (!editError) setEditingId(null);
                  }}
                  className={controlClass(Boolean(editError))}
                />
                {editError && (
                  <p role="alert" className="flex items-center gap-1 text-xs font-medium text-red-700">
                    <AlertCircle className="size-3.5" aria-hidden />
                    {editError}
                  </p>
                )}
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingId(s.id);
                  setEditValue(s.title);
                  setEditError(undefined);
                }}
                title="Renommer"
                className={cn(
                  'min-h-11 min-w-0 flex-1 truncate rounded text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                  s.done ? 'text-subtle line-through' : 'text-ink',
                )}
              >
                {s.title}
              </button>
            )}
            <IconButton label={`Supprimer la sous-tâche ${s.title}`} tone="danger" icon={<Trash2 className="size-4" />} onClick={() => void onRemove(s.id)} />
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-1">
        <div className="flex gap-2">
          <input
            aria-label="Ajouter une sous-tâche"
            placeholder="Ajouter une sous-tâche"
            value={draft}
            aria-invalid={addError ? true : undefined}
            aria-describedby={addError ? `subtask-add-error-${taskId}` : undefined}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void add();
              }
            }}
            className={controlClass(Boolean(addError))}
          />
          <IconButton label="Ajouter la sous-tâche" icon={<Plus className="size-5" />} className="bg-brand-soft" onClick={() => void add()} />
        </div>
        {addError && (
          <p id={`subtask-add-error-${taskId}`} className="flex items-center gap-1 text-xs font-medium text-red-700">
            <AlertCircle className="size-3.5" aria-hidden />
            {addError}
          </p>
        )}
      </div>
    </div>
  );
}
