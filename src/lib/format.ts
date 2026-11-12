import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { parseLocalDate } from '@/domain/dates';
import type { LocalDate } from '@/domain/types';

/** `11 nov.` */
export const shortDate = (d: LocalDate) => format(parseLocalDate(d), 'd MMM', { locale: fr });
/** `mer. 11 nov.` */
export const weekdayShortDate = (d: LocalDate) => format(parseLocalDate(d), 'EEE d MMM', { locale: fr });
/** `mercredi 11 novembre` */
export const longDate = (d: LocalDate) => format(parseLocalDate(d), 'EEEE d MMMM', { locale: fr });
/** `28 oct. → 02 nov.` */
export const dateRange = (a: LocalDate, b: LocalDate) => `${shortDate(a)} → ${shortDate(b)}`;

/** `1 h 05`, `12 min 03 s`, `45 s`. */
export function formatDuration(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  if (h > 0) return `${h} h ${p(m)}`;
  if (m > 0) return `${m} min ${p(s)} s`;
  return `${s} s`;
}
