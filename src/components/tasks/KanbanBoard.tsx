'use client';

import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/lib/cn';
import { STATUS_LABELS } from '@/lib/constants';
import { useIsMobile } from '@/lib/use-today';
import { TASK_STATUSES, type ID, type TaskBoard, type TaskCardData, type TaskStatus } from '@/domain/types';
import { Segmented } from '@/components/ui/Segmented';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';

export interface KanbanBoardProps {
  board: TaskBoard;
  showAttachments: boolean;
  onMove: (id: ID, status: TaskStatus, beforeId?: ID) => void;
  onCreateIn: (status: TaskStatus) => void;
  onOpen: (id: ID) => void;
  onToggleStar: (id: ID) => void;
  onToggleSubtask: (subtaskId: ID) => void;
  onDelete: (id: ID) => void;
}

interface Location {
  status: TaskStatus;
  index: number;
  task?: TaskCardData;
}

const instructions = {
  draggable:
    'Pour déplacer une tâche, appuyez sur Espace ou Entrée sur sa poignée. Flèches gauche et droite : changer de colonne. Flèches haut et bas : changer de position. Espace : déposer. Échap : annuler.',
};

export function KanbanBoard(props: KanbanBoardProps) {
  const isMobile = useIsMobile();
  return isMobile ? <MobileBoard {...props} /> : <DndBoard {...props} />;
}

/* ------------------------------ Mobile : un statut à la fois, pas de DnD ------------------------------ */

function MobileBoard({ board, showAttachments, onMove, onCreateIn, onOpen, onToggleStar, onToggleSubtask, onDelete }: KanbanBoardProps) {
  const [status, setStatus] = useState<TaskStatus>('in_progress');
  return (
    <div className="flex flex-col gap-4">
      <Segmented
        ariaLabel="Colonne affichée"
        value={status}
        onChange={setStatus}
        options={TASK_STATUSES.map((s) => ({ value: s, label: `${STATUS_LABELS[s]} (${board[s].length})` }))}
        className="w-full"
      />
      <KanbanColumn status={status} count={board[status].length} onCreate={() => onCreateIn(status)} droppable={false}>
        {board[status].map((t) => (
          <TaskCard
            key={t.id}
            task={t}
            showAttachments={showAttachments}
            onOpen={onOpen}
            onToggleStar={onToggleStar}
            onToggleSubtask={onToggleSubtask}
            onMove={(id, s) => onMove(id, s)}
            onDelete={onDelete}
          />
        ))}
      </KanbanColumn>
    </div>
  );
}

/* ------------------------------ Bureau / tablette : dnd-kit ------------------------------ */

function DndBoard({ board, showAttachments, onMove, onCreateIn, onOpen, onToggleStar, onToggleSubtask, onDelete }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<ID | null>(null);
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const locate = useMemo(() => {
    return (id: UniqueIdentifier | null | undefined): Location | null => {
      if (id == null) return null;
      const sid = String(id);
      if (sid.startsWith('col:')) {
        const status = sid.slice(4) as TaskStatus;
        return { status, index: board[status].length };
      }
      for (const status of TASK_STATUSES) {
        const index = board[status].findIndex((t) => t.id === sid);
        if (index >= 0) return { status, index, task: board[status][index] };
      }
      return null;
    };
  }, [board]);

  const activeTask = activeId ? locate(activeId)?.task : undefined;
  const overLoc = locate(overId);
  const activeLoc = locate(activeId);
  const overStatus = overLoc?.status ?? null;

  const announcements: Announcements = {
    onDragStart({ active }) {
      const l = locate(active.id);
      return l?.task ? `Tâche ${l.task.title} saisie, position ${l.index + 1} dans la colonne ${STATUS_LABELS[l.status]}.` : undefined;
    },
    onDragOver({ active, over }) {
      const a = locate(active.id);
      const o = locate(over?.id);
      if (!a?.task || !o) return undefined;
      return `Tâche ${a.task.title} au-dessus de la colonne ${STATUS_LABELS[o.status]}, position ${o.index + 1}.`;
    },
    onDragEnd({ active, over }) {
      const a = locate(active.id);
      const o = locate(over?.id);
      if (!a?.task) return undefined;
      return o
        ? `Tâche ${a.task.title} déplacée dans la colonne ${STATUS_LABELS[o.status]}, position ${o.index + 1}.`
        : `Déplacement annulé, ${a.task.title} reste dans ${STATUS_LABELS[a.status]}.`;
    },
    onDragCancel({ active }) {
      const a = locate(active.id);
      return a?.task ? `Déplacement annulé, ${a.task.title} reste dans ${STATUS_LABELS[a.status]}.` : undefined;
    },
  };

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragOver = (e: DragOverEvent) => setOverId(e.over?.id ?? null);
  const reset = () => {
    setActiveId(null);
    setOverId(null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const a = locate(e.active.id);
    const o = locate(e.over?.id);
    reset();
    if (!a?.task || !o) return;
    const id = a.task.id;
    const col = board[o.status];
    const overIsColumn = String(e.over?.id).startsWith('col:');
    let beforeId: ID | undefined;
    if (!overIsColumn) {
      if (a.status === o.status) {
        if (a.index === o.index) return;
        beforeId = a.index < o.index ? col[o.index + 1]?.id : col[o.index].id;
      } else {
        beforeId = col[o.index].id;
      }
    } else if (a.status === o.status) {
      return; // déposé dans sa propre colonne, hors carte : rien à faire
    }
    onMove(id, o.status, beforeId);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      accessibility={{ announcements, screenReaderInstructions: instructions }}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={reset}
    >
      <div className="-mx-1 flex snap-x gap-6 overflow-x-auto px-1 pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible">
        {TASK_STATUSES.map((status) => (
          <div key={status} className="w-[280px] shrink-0 snap-start lg:w-auto">
            <KanbanColumn
              status={status}
              count={board[status].length}
              isOver={activeId != null && overStatus === status && activeLoc?.status !== status}
              onCreate={() => onCreateIn(status)}
            >
              <SortableContext items={board[status].map((t) => t.id)} strategy={verticalListSortingStrategy}>
                {board[status].map((t) => (
                  <SortableCard
                    key={t.id}
                    task={t}
                    showAttachments={showAttachments}
                    showIndicator={activeId != null && overId === t.id && activeLoc?.status !== status}
                    onOpen={onOpen}
                    onToggleStar={onToggleStar}
                    onToggleSubtask={onToggleSubtask}
                    onMove={(id, s) => onMove(id, s)}
                    onDelete={onDelete}
                  />
                ))}
              </SortableContext>
            </KanbanColumn>
          </div>
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 180 }}>
        {activeTask ? (
          <div className="rotate-[-1deg] scale-[1.02] rounded-2xl shadow-card-lg">
            <TaskCard
              task={activeTask}
              showAttachments={showAttachments}
              onOpen={() => {}}
              onToggleStar={() => {}}
              onToggleSubtask={() => {}}
              onMove={() => {}}
              onDelete={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function SortableCard({
  task,
  showIndicator,
  ...rest
}: {
  task: TaskCardData;
  showIndicator: boolean;
  showAttachments: boolean;
  onOpen: (id: ID) => void;
  onToggleStar: (id: ID) => void;
  onToggleSubtask: (id: ID) => void;
  onMove: (id: ID, s: TaskStatus) => void;
  onDelete: (id: ID) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: transform ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)` : undefined, transition }}
      className={cn('relative', isDragging && 'z-10')}
      {...listeners}
    >
      {showIndicator && <div aria-hidden className="absolute -top-2.5 left-0 right-0 h-1 rounded-full bg-brand" />}
      <TaskCard task={task} isDragging={isDragging} dragHandleRef={setActivatorNodeRef} dragHandleProps={attributes} {...rest} />
    </div>
  );
}
