'use client';

import { useState } from 'react';
import { useDashboard, useTasks } from '@/data/hooks';
import { timerService } from '@/data/services/timer';
import { useToday } from '@/lib/use-today';
import type { LocalDate, Profile } from '@/domain/types';
import { CompletedHistogram } from '@/components/dashboard/CompletedHistogram';
import { EfficiencyRings } from '@/components/dashboard/EfficiencyRings';
import { ProfileCard } from '@/components/dashboard/ProfileCard';
import { PlanDayPanel } from '@/components/plan-day/PlanDayPanel';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useTaskEditor } from '@/components/tasks/TaskEditorProvider';

export interface RightPanelProps {
  /** `compact` = Profil + Plan seulement (Tableau de bord). */
  variant: 'full' | 'compact';
  profile: Profile | undefined;
  date: LocalDate;
  onRenameProfile?: (displayName: string) => void | Promise<unknown>;
}

export function RightPanel({ variant, profile, date, onRenameProfile }: RightPanelProps) {
  return (
    <div className="flex flex-col gap-8 md:grid md:grid-cols-2 xl:flex xl:flex-col">
      <section aria-label="Profil" className="md:col-span-2 xl:col-span-1">
        {profile ? <ProfileCard profile={profile} onRename={onRenameProfile} /> : <Skeleton variant="row" className="mx-auto h-32 w-40" />}
      </section>

      <section aria-labelledby="panel-plan">
        <h2 id="panel-plan" className="mb-3 font-display text-sm font-semibold text-ink">
          Plan
        </h2>
        <PlanSection today={date} />
      </section>

      {variant === 'full' && <Analytics date={date} />}
    </div>
  );
}

function PlanSection({ today }: { today: LocalDate }) {
  const [selected, setSelected] = useState<LocalDate | null>(null);
  const date = selected ?? today;
  const tasks = useTasks();
  const toast = useToast();

  // Un échec d'écriture ne doit jamais passer pour un succès (stockage plein ou refusé).
  const guard = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await fn();
    } catch {
      toast.push({ tone: 'error', message: 'Enregistrement impossible : espace de stockage insuffisant ou refusé.' });
      return fallback;
    }
  };

  if (!today) return <Skeleton variant="row" />;

  return (
    <PlanDayPanel
      date={date}
      today={today}
      tasks={tasks ?? []}
      onDateChange={setSelected}
      onStart={async (id) => {
        const res = await guard(() => timerService.start(id), null);
        if (res && !res.ok) toast.push({ tone: 'error', message: res.errors.taskId ?? 'Impossible de démarrer le chrono.' });
      }}
      onPause={() => guard(() => timerService.pause(), undefined)}
      onStop={() => guard(() => timerService.stop(), undefined)}
      onResetDay={async (id, d) => {
        await guard(async () => {
          await timerService.resetDay(id, d);
          toast.push({ message: 'Temps du jour remis à zéro' });
        }, undefined);
      }}
    />
  );
}

function Analytics({ date }: { date: LocalDate }) {
  const dash = useDashboard(4);
  const editor = useTaskEditor();
  const today = useToday() || date;

  return (
    <>
      <section aria-labelledby="panel-eff">
        <h2 id="panel-eff" className="mb-3 font-display text-sm font-semibold text-ink">
          Efficacité
        </h2>
        {dash ? (
          <EfficiencyRings
            rings={dash.rings}
            size="sm"
            limit={4}
            totalTasks={dash.totalTasks}
            onSelect={(id) => editor.openEdit(id)}
            onCreate={() => editor.openCreate()}
          />
        ) : (
          <div className="flex gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} variant="ring" />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="panel-done">
        <h2 id="panel-done" className="mb-3 font-display text-sm font-semibold text-ink">
          Tâches terminées
        </h2>
        {dash ? <CompletedHistogram data={dash.completed} size="sm" today={today} /> : <Skeleton variant="card" className="h-40" />}
      </section>
    </>
  );
}
