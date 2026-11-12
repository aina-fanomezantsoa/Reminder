import { fr } from 'date-fns/locale';
import { format } from 'date-fns';
import { addDaysLocal, formatLocalDate, parseLocalDate } from './dates';
import type { BarDatum, CompletedPerDay, ComputeRings, RingMetric } from './types';

/**
 * Un anneau par tâche (percent = progress). Tri (DESIGN 6.1) : non terminées d'abord, favoris d'abord,
 * `updatedAt` décroissant ; puis troncature à `limit`. [] si aucune tâche ou limit <= 0.
 */
export const computeRings: ComputeRings = (tasks, limit) => {
  if (limit <= 0 || tasks.length === 0) return [];
  const sorted = [...tasks].sort((a, b) => {
    const done = Number(a.status === 'done') - Number(b.status === 'done');
    if (done !== 0) return done;
    const star = Number(b.starred) - Number(a.starred);
    if (star !== 0) return star;
    return b.updatedAt - a.updatedAt;
  });
  return sorted.slice(0, Math.floor(limit)).map(
    (t): RingMetric => ({
      taskId: t.id,
      label: t.title,
      percent: Math.min(100, Math.max(0, Math.round(t.progress))),
    }),
  );
};

/** `days` jours consécutifs finissant à `today` (le plus ancien en premier), comptés d'après `completedAt`. */
export const completedPerDay: CompletedPerDay = (tasks, days, today) => {
  const n = Math.max(0, Math.floor(days));
  const counts = new Map<string, number>();
  for (const t of tasks) {
    if (t.status !== 'done') continue;
    // Repli sur updatedAt pour une tâche « done » sans date de fin (données anciennes ou importées).
    const d = formatLocalDate(new Date(t.completedAt ?? t.updatedAt));
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  const out: BarDatum[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = addDaysLocal(today, -i);
    out.push({ label: format(parseLocalDate(date), 'EEE', { locale: fr }), date, count: counts.get(date) ?? 0 });
  }
  return out;
};
