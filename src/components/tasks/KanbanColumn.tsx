'use client';

import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/cn';
import { STATUS_LABELS, STATUS_STYLES } from '@/lib/constants';
import type { TaskStatus } from '@/domain/types';
import { Button } from '@/components/ui/Button';

export interface KanbanColumnProps {
  status: TaskStatus;
  count: number;
  isOver?: boolean;
  onCreate: () => void;
  /** Cartes (déjà rendues). */
  children: ReactNode;
  /** Désactive la zone de dépôt (mobile). */
  droppable?: boolean;
}

export const columnDropId = (status: TaskStatus) => `col:${status}`;

export function KanbanColumn({ status, count, isOver, onCreate, children, droppable = true }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id: columnDropId(status), disabled: !droppable });
  const headingId = `col-title-${status}`;

  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-4">
      <h2 id={headingId} className="flex items-center justify-center gap-2 text-center font-display text-sm font-semibold text-ink">
        <span aria-hidden className={cn('size-2 rounded-full', STATUS_STYLES[status].dot)} />
        {STATUS_LABELS[status]}
        <span className="font-medium text-muted">({count})</span>
      </h2>
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-40 flex-1 flex-col gap-4 rounded-2xl p-1 transition duration-150 motion-reduce:transition-none',
          isOver && 'bg-brand-soft ring-2 ring-brand',
        )}
      >
        {count === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line px-4 py-8 text-center">
            <p className="text-sm font-medium text-muted">Aucune tâche</p>
          </div>
        ) : (
          children
        )}
      </div>
      <Button variant="ghost" size="sm" leftIcon={<Plus className="size-4" aria-hidden />} onClick={onCreate} className="text-muted">
        Ajouter
        <span className="sr-only"> une tâche dans la colonne {STATUS_LABELS[status]}</span>
      </Button>
    </section>
  );
}
