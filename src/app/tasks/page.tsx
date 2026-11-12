'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ClipboardList, Plus } from 'lucide-react';
import { useTaskBoard, useTasks } from '@/data/hooks';
import { taskService } from '@/data/services/tasks';
import { addDaysLocal } from '@/domain/dates';
import { longDate } from '@/lib/format';
import { useToday } from '@/lib/use-today';
import { TASK_STATUSES, type ID, type LocalDate, type TaskStatus } from '@/domain/types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Scene } from '@/components/layout/Scene';
import { GanttChart } from '@/components/planning/GanttChart';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';
import { useTaskEditor } from '@/components/tasks/TaskEditorProvider';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

export default function TasksPage() {
  const board = useTaskBoard();
  const tasks = useTasks();
  const today = useToday();
  const editor = useTaskEditor();
  const toast = useToast();
  const [windowOverride, setWindowOverride] = useState<LocalDate | null>(null);

  const windowStart = windowOverride ?? (today ? addDaysLocal(today, -2) : '');
  const total = board ? TASK_STATUSES.reduce((n, s) => n + board[s].length, 0) : undefined;

  const run = async (fn: () => Promise<unknown>, errorMessage: string) => {
    try {
      await fn();
    } catch {
      toast.push({ tone: 'error', message: errorMessage });
    }
  };
  const move = (id: ID, status: TaskStatus, beforeId?: ID) => run(() => taskService.move(id, status, beforeId), 'Impossible de déplacer la tâche. Réessayez.');

  return (
    <>
      <PageHeader
        title="Gestion des tâches"
        subtitle={today ? longDate(today) : undefined}
        actions={
          <Button leftIcon={<Plus className="size-4" aria-hidden />} onClick={() => editor.openCreate()}>
            Nouvelle tâche
          </Button>
        }
      />
      <Scene className="flex flex-col gap-8">
        {board === undefined || tasks === undefined ? (
          <div aria-busy="true" aria-label="Chargement des tâches" className="grid gap-6 lg:grid-cols-4">
            {TASK_STATUSES.map((s) => (
              <div key={s} className="flex flex-col gap-4">
                <Skeleton variant="card" />
                <Skeleton variant="card" />
              </div>
            ))}
          </div>
        ) : total === 0 ? (
          <EmptyState
            icon={<ClipboardList className="size-7" />}
            title="Aucune tâche pour l'instant"
            description="Créez votre première tâche pour la voir ici et dans le planning."
            action={{ label: 'Créer une tâche', onClick: () => editor.openCreate() }}
          />
        ) : (
          <>
            <section aria-labelledby="tasks-gantt">
              <div className="mb-3 flex items-center justify-between">
                <h2 id="tasks-gantt" className="font-display text-sm font-semibold text-ink">
                  Calendrier des tâches
                </h2>
                <Link
                  href="/planning"
                  className="rounded text-sm font-medium text-brand underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  Ouvrir le planning
                </Link>
              </div>
              {windowStart && (
                <GanttChart
                  variant="compact"
                  tasks={tasks}
                  windowStart={windowStart}
                  days={9}
                  today={today}
                  onWindowChange={setWindowOverride}
                  onOpenTask={editor.openEdit}
                />
              )}
            </section>
            <KanbanBoard
              board={board}
              showAttachments={false}
              onMove={(id, status, beforeId) => void move(id, status, beforeId)}
              onCreateIn={editor.openCreate}
              onOpen={editor.openEdit}
              onToggleStar={(id) => void run(() => taskService.toggleStar(id), "Impossible de modifier le favori.")}
              onToggleSubtask={(id) => void run(() => taskService.toggleSubtask(id), 'Impossible de modifier la sous-tâche.')}
              onDelete={editor.requestDelete}
            />
          </>
        )}
      </Scene>
    </>
  );
}
