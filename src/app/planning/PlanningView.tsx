'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useCalendarEntries, useTasks } from '@/data/hooks';
import { taskService } from '@/data/services/tasks';
import { addDaysLocal } from '@/domain/dates';
import { CalendarMonth } from '@/components/planning/CalendarMonth';
import { useReminderEditor } from '@/components/reminders/ReminderEditorProvider';
import { useToday } from '@/lib/use-today';
import type { ID, LocalDate, TaskStatus } from '@/domain/types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Scene } from '@/components/layout/Scene';
import { GanttChart } from '@/components/planning/GanttChart';
import { useTaskEditor } from '@/components/tasks/TaskEditorProvider';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { longDate } from '@/lib/format';

type View = 'gantt' | 'calendrier';

/** Calendrier : tâches et rappels du mois affiché (le hook est monté seulement sur cet onglet). */
function CalendarTab({ today }: { today: LocalDate }) {
  const editor = useTaskEditor();
  const reminderEditor = useReminderEditor();
  const [monthOverride, setMonthOverride] = useState<LocalDate | null>(null);
  const monthStart = monthOverride ?? `${today.slice(0, 7)}-01`;
  const entries = useCalendarEntries(monthStart);
  return (
    <CalendarMonth
      monthStart={monthStart}
      entries={entries}
      today={today}
      onMonthChange={setMonthOverride}
      onSelectTask={editor.openEdit}
      onSelectReminder={reminderEditor.openEdit}
      onCreateTask={(date) => editor.openCreate(undefined, { date })}
      onCreateReminder={(date) => reminderEditor.openCreate({ date })}
    />
  );
}

export function PlanningView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const view: View = params.get('vue') === 'calendrier' ? 'calendrier' : 'gantt';

  const tasks = useTasks();
  const today = useToday();
  const editor = useTaskEditor();
  const toast = useToast();
  const [windowOverride, setWindowOverride] = useState<LocalDate | null>(null);
  const windowStart = windowOverride ?? (today ? addDaysLocal(today, -2) : '');

  const changeStatus = async (id: ID, status: TaskStatus) => {
    try {
      await taskService.move(id, status);
    } catch {
      toast.push({ tone: 'error', message: 'Impossible de déplacer la tâche. Réessayez.' });
    }
  };

  return (
    <>
      <PageHeader
        title="Planning"
        subtitle={today ? longDate(today) : undefined}
        actions={
          <>
            <Segmented<View>
              ariaLabel="Vue du planning"
              value={view}
              onChange={(v) => router.replace(`${pathname}?vue=${v}`)}
              options={[
                { value: 'gantt', label: 'Gantt' },
                { value: 'calendrier', label: 'Calendrier' },
              ]}
            />
            <Button leftIcon={<Plus className="size-4" aria-hidden />} onClick={() => editor.openCreate()}>
              Nouvelle tâche
            </Button>
          </>
        }
      />
      <Scene>
        {view === 'gantt' ? (
          tasks === undefined || !windowStart ? (
            <div aria-busy="true" className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} variant="bar" />
              ))}
            </div>
          ) : (
            <GanttChart
              variant="full"
              tasks={tasks}
              windowStart={windowStart}
              days={14}
              today={today}
              onWindowChange={setWindowOverride}
              onOpenTask={editor.openEdit}
              onChangeStatus={(id, s) => void changeStatus(id, s)}
              onCreateTask={() => editor.openCreate()}
            />
          )
        ) : today ? (
          <CalendarTab today={today} />
        ) : null}
      </Scene>
    </>
  );
}
