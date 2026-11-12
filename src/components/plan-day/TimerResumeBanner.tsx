'use client';

import { useState } from 'react';
import { Timer } from 'lucide-react';
import { useActiveSession, useTasks } from '@/data/hooks';
import { timerService } from '@/data/services/timer';
import { fromEpochMs, formatLocalDate, parseLocalDate } from '@/domain/dates';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

const STALE_MS = 12 * 3600 * 1000;

/** Bandeau « chrono toujours en cours » : session ouverte avant minuit local ou depuis plus de ~12 h. */
export function TimerResumeHost() {
  const session = useActiveSession();
  const tasks = useTasks();
  const toast = useToast();
  const [kept, setKept] = useState<string | null>(null);
  // Instant de montage : suffit pour détecter une session héritée d'une visite précédente.
  const [now] = useState(() => Date.now());

  if (!session || kept === session.id) return null;
  const dayStart = parseLocalDate(formatLocalDate(new Date(now))).getTime();
  if (session.start >= dayStart && now - session.start <= STALE_MS) return null;

  const title = tasks?.find((t) => t.id === session.taskId)?.title ?? 'une tâche';
  const { time } = fromEpochMs(session.start);

  return (
    <section role="region" aria-labelledby="timer-resume-title" className="mb-4 flex gap-4 rounded-2xl bg-amber-100 p-5 text-amber-900">
      <Timer className="mt-0.5 size-6 shrink-0" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <h2 id="timer-resume-title" className="font-display text-base font-semibold">
          Chrono toujours en cours depuis {time}, le garder ?
        </h2>
        <p className="truncate text-sm" title={title}>
          Tâche : {title}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setKept(session.id)}>
            Garder
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => timerService.stop().catch(() => toast.push({ tone: 'error', message: 'Impossible d’arrêter le chrono. Réessayez.' }))}
          >
            Arrêter
          </Button>
        </div>
      </div>
    </section>
  );
}
