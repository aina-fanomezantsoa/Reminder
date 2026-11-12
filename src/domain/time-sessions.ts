import { addDaysLocal, formatLocalDate, parseLocalDate } from './dates';
import type { EpochMs, ID, LocalDate, TimeSession } from './types';

/** Découpe une session par jour LOCAL (une session ouverte court jusqu'à `now`). */
export function splitByDay(session: TimeSession, now: EpochMs): { date: LocalDate; ms: number }[] {
  const end = session.end ?? now;
  const out: { date: LocalDate; ms: number }[] = [];
  if (end <= session.start) return out;
  let date = formatLocalDate(new Date(session.start));
  let cursor = session.start;
  while (cursor < end) {
    const next = parseLocalDate(addDaysLocal(date, 1)).getTime();
    const stop = Math.min(next, end);
    out.push({ date, ms: Math.max(0, stop - cursor) });
    cursor = stop;
    date = addDaysLocal(date, 1);
  }
  return out;
}

export const totalMs = (sessions: TimeSession[], now: EpochMs): number =>
  sessions.reduce((sum, s) => sum + Math.max(0, (s.end ?? now) - s.start), 0);

export function dayMsByTask(sessions: TimeSession[], date: LocalDate, now: EpochMs): Map<ID, number> {
  const m = new Map<ID, number>();
  for (const s of sessions) {
    for (const part of splitByDay(s, now)) {
      if (part.date === date) m.set(s.taskId, (m.get(s.taskId) ?? 0) + part.ms);
    }
  }
  return m;
}
