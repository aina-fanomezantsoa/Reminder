'use client';

import { Bell, ClipboardList, Plus } from 'lucide-react';
import { useDashboard } from '@/data/hooks';
import { longDate } from '@/lib/format';
import { useToday } from '@/lib/use-today';
import { PageHeader } from '@/components/layout/PageHeader';
import { Scene } from '@/components/layout/Scene';
import { CompletedHistogram } from '@/components/dashboard/CompletedHistogram';
import { EfficiencyRings } from '@/components/dashboard/EfficiencyRings';
import { useTaskEditor } from '@/components/tasks/TaskEditorProvider';
import { useReminderEditor } from '@/components/reminders/ReminderEditorProvider';
import { UpcomingReminders } from '@/components/reminders/UpcomingReminders';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

export default function DashboardPage() {
  const dash = useDashboard(8);
  const today = useToday();
  const editor = useTaskEditor();
  const reminderEditor = useReminderEditor();

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        subtitle={today ? longDate(today) : undefined}
        actions={
          <>
            <Button leftIcon={<Plus className="size-4" aria-hidden />} onClick={() => editor.openCreate()}>
              Nouvelle tâche
            </Button>
            <Button variant="secondary" leftIcon={<Bell className="size-4" aria-hidden />} onClick={() => reminderEditor.openCreate()}>
              Nouveau rappel
            </Button>
          </>
        }
      />
      <Scene className="flex flex-col gap-6">
        {dash?.totalTasks === 0 && (
          <section aria-labelledby="welcome" className="flex flex-col items-start gap-4 rounded-2xl bg-surface p-6 shadow-card">
            <h2 id="welcome" className="font-display text-xl font-semibold text-ink">
              Bienvenue dans Reminder
            </h2>
            <p className="max-w-xl text-sm text-body">
              Créez une tâche pour suivre son avancement, ou un rappel pour être prévenu à l&apos;heure dite. Vos données restent sur cet appareil.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button leftIcon={<ClipboardList className="size-4" aria-hidden />} onClick={() => editor.openCreate()}>
                Créer ma première tâche
              </Button>
              <Button variant="secondary" leftIcon={<Bell className="size-4" aria-hidden />} onClick={() => reminderEditor.openCreate()}>
                Créer un rappel
              </Button>
            </div>
          </section>
        )}

        <section aria-labelledby="dash-eff" className="rounded-2xl bg-surface p-5 shadow-card">
          <h2 id="dash-eff" className="mb-4 font-display text-base font-semibold text-ink">
            Efficacité
          </h2>
          {dash ? (
            <EfficiencyRings
              rings={dash.rings}
              size="lg"
              limit={8}
              totalTasks={dash.totalTasks}
              onSelect={editor.openEdit}
              onCreate={() => editor.openCreate()}
            />
          ) : (
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} variant="ring" className="mx-auto size-24" />
              ))}
            </div>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <section aria-labelledby="dash-done" className="rounded-2xl bg-surface p-5 shadow-card lg:col-span-2">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="dash-done" className="font-display text-base font-semibold text-ink">
                Tâches terminées
              </h2>
              {dash && <p className="text-xs font-medium text-subtle">7 derniers jours · {dash.completed.reduce((s, d) => s + d.count, 0)} au total</p>}
            </div>
            {dash ? (
              <CompletedHistogram data={dash.completed} size="lg" today={today || dash.completed[dash.completed.length - 1]?.date} />
            ) : (
              <Skeleton variant="card" className="h-64" />
            )}
          </section>

          <section aria-labelledby="dash-reminders" className="rounded-2xl bg-surface p-5 shadow-card">
            <h2 id="dash-reminders" className="mb-4 font-display text-base font-semibold text-ink">
              Prochains rappels
            </h2>
            <UpcomingReminders />
          </section>
        </div>
      </Scene>
    </>
  );
}
