'use client';

import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useNotificationPermission, useReminders, useTasks } from '@/data/hooks';
import { reminderService } from '@/data/services/reminders';
import { settingsService } from '@/data/services/settings';
import { notificationService } from '@/notifications/scheduler';
import { longDate } from '@/lib/format';
import { useToday } from '@/lib/use-today';
import type { ID, Task } from '@/domain/types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Scene } from '@/components/layout/Scene';
import { NotificationBanner } from '@/components/reminders/NotificationBanner';
import { ReminderList } from '@/components/reminders/ReminderList';
import { useReminderEditor } from '@/components/reminders/ReminderEditorProvider';
import { useTaskEditor } from '@/components/tasks/TaskEditorProvider';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

export default function RemindersPage() {
  const lists = useReminders();
  const tasks = useTasks();
  const permission = useNotificationPermission();
  const today = useToday();
  const editor = useReminderEditor();
  const taskEditor = useTaskEditor();
  const toast = useToast();

  const tasksById = useMemo(() => {
    const map: Record<ID, Task> = {};
    for (const t of tasks ?? []) map[t.id] = t;
    return map;
  }, [tasks]);

  const request = async () => {
    const state = await notificationService.requestPermission(); // sur clic uniquement (CA-R5.1)
    if (state !== 'default') void settingsService.setNotificationPromptState('answered').catch(() => undefined);
    return state;
  };

  const acknowledge = async (eventId: string) => {
    try {
      await reminderService.acknowledgeMissed(eventId);
    } catch {
      toast.push({ tone: 'error', message: 'Impossible de fermer le bandeau. Réessayez.' });
    }
  };

  return (
    <>
      <PageHeader
        title="Rappels"
        subtitle={today ? longDate(today) : undefined}
        actions={
          <Button leftIcon={<Plus className="size-4" aria-hidden />} onClick={() => editor.openCreate()}>
            Nouveau rappel
          </Button>
        }
      />
      <div className="mb-4">
        <NotificationBanner permission={permission} onRequest={request} />
      </div>
      <Scene>
        {lists === undefined ? (
          <div aria-busy="true" aria-label="Chargement des rappels" className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} variant="card" className="h-28" />
            ))}
          </div>
        ) : (
          <ReminderList
            upcoming={lists.upcoming}
            past={lists.past}
            missed={lists.missed}
            tasksById={tasksById}
            onEdit={editor.openEdit}
            onDelete={editor.requestDelete}
            onAcknowledge={(id) => void acknowledge(id)}
            onOpenTask={taskEditor.openEdit}
            onCreate={() => editor.openCreate()}
          />
        )}
      </Scene>
    </>
  );
}
