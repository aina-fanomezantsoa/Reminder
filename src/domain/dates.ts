import type { EpochMs, LocalDate, LocalTime } from './types';

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

export function isValidLocalDate(s: string): boolean {
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
}

export function isValidLocalTime(s: string): boolean {
  return TIME_RE.test(s);
}

/** Minuit local du jour donné. Lève si invalide (utiliser isValidLocalDate avant pour une saisie). */
export function parseLocalDate(s: LocalDate): Date {
  const m = DATE_RE.exec(s);
  if (!m) throw new Error(`Date locale invalide : ${s}`);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function formatLocalDate(d: Date): LocalDate {
  return `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function timeToMinutes(t: LocalTime): number {
  const m = TIME_RE.exec(t);
  if (!m) throw new Error(`Heure locale invalide : ${t}`);
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Instant (epoch ms) correspondant à date + heure dans le fuseau local. */
export function toEpochMs(date: LocalDate, time: LocalTime): EpochMs {
  const d = parseLocalDate(date);
  const mins = timeToMinutes(time);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(mins / 60), mins % 60).getTime();
}

export function fromEpochMs(ms: EpochMs): { date: LocalDate; time: LocalTime } {
  const d = new Date(ms);
  return { date: formatLocalDate(d), time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}

export function todayLocal(now: EpochMs = Date.now()): LocalDate {
  return formatLocalDate(new Date(now));
}

/** Ajoute n jours calendaires (insensible aux changements d'heure). */
export function addDaysLocal(date: LocalDate, n: number): LocalDate {
  const d = parseLocalDate(date);
  return formatLocalDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
}

/** Nombre de jours calendaires entre a et b (b - a), insensible à l'heure d'été. */
export function diffDaysLocal(a: LocalDate, b: LocalDate): number {
  const da = parseLocalDate(a);
  const db = parseLocalDate(b);
  return Math.round((Date.UTC(db.getFullYear(), db.getMonth(), db.getDate()) - Date.UTC(da.getFullYear(), da.getMonth(), da.getDate())) / 86_400_000);
}
