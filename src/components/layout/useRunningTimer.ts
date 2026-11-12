'use client';

import { useActiveSession, useNow, useTasks } from '@/data/hooks';

/** `12:03` ou `1:02:03`. */
export function clock(ms: number): string {
  const t = Math.floor(Math.max(0, ms) / 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  return h > 0 ? `${h}:${p(m)}:${p(t % 60)}` : `${p(m)}:${p(t % 60)}`;
}

/** Chrono en cours (session ouverte) avec temps écoulé en direct ; `null` si aucun. */
export function useRunningTimer() {
  const session = useActiveSession();
  const tasks = useTasks();
  const now = useNow(!!session);
  if (!session) return null;
  return { session, title: tasks?.find((t) => t.id === session.taskId)?.title ?? 'Tâche', elapsed: now - session.start };
}
