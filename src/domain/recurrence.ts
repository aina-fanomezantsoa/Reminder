import { addMonths } from 'date-fns';
import { addDaysLocal, diffDaysLocal, formatLocalDate, parseLocalDate, toEpochMs } from './dates';
import type { EpochMs, LocalDate, Reminder } from './types';

/** Sous-ensemble d'un Reminder suffisant pour calculer ses occurrences. */
export type RecurrenceRule = Pick<Reminder, 'startDate' | 'time' | 'recurrence'>;

/** Date de l'occurrence n°k (k >= 0), calculée depuis l'ancre `startDate`, jamais depuis la précédente. */
export function occurrenceDate(rule: RecurrenceRule, k: number): LocalDate {
  switch (rule.recurrence) {
    case 'none':
      return rule.startDate;
    case 'daily':
      return addDaysLocal(rule.startDate, k);
    case 'weekly':
      return addDaysLocal(rule.startDate, 7 * k);
    case 'monthly':
      // addMonths clampe au dernier jour du mois ; partir de l'ancre fait revenir au 31 en mars.
      return formatLocalDate(addMonths(parseLocalDate(rule.startDate), k));
  }
}

/** Instant de l'occurrence n°k (heure locale conservée à travers les changements d'heure). */
export function occurrenceAt(rule: RecurrenceRule, k: number): EpochMs {
  return toEpochMs(occurrenceDate(rule, k), rule.time);
}

/** Estimation par défaut de l'indice de l'occurrence la plus proche de `date` (peut être décalée de 1). */
function estimateIndex(rule: RecurrenceRule, date: LocalDate): number {
  const days = diffDaysLocal(rule.startDate, date);
  switch (rule.recurrence) {
    case 'none':
      return 0;
    case 'daily':
      return days;
    case 'weekly':
      return Math.floor(days / 7);
    case 'monthly': {
      const a = parseLocalDate(rule.startDate);
      const b = parseLocalDate(date);
      return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
    }
  }
}

function localDateOfMs(ms: EpochMs): LocalDate {
  return formatLocalDate(new Date(ms));
}

/** Première occurrence strictement postérieure à `afterMs`, ou `null` (rappel non récurrent déjà passé). */
export function nextOccurrenceAfter(rule: RecurrenceRule, afterMs: EpochMs): EpochMs | null {
  if (rule.recurrence === 'none') {
    const at = occurrenceAt(rule, 0);
    return at > afterMs ? at : null;
  }
  let k = Math.max(0, estimateIndex(rule, localDateOfMs(afterMs)) - 2);
  while (occurrenceAt(rule, k) <= afterMs) k++;
  return occurrenceAt(rule, k);
}

/** Dernière occurrence <= `atMs` (rattrapage des occurrences manquées), ou `null` si aucune n'est échue. */
export function latestOccurrenceAtOrBefore(rule: RecurrenceRule, atMs: EpochMs): EpochMs | null {
  if (occurrenceAt(rule, 0) > atMs) return null;
  if (rule.recurrence === 'none') return occurrenceAt(rule, 0);
  let k = Math.max(0, estimateIndex(rule, localDateOfMs(atMs)) - 2);
  while (occurrenceAt(rule, k + 1) <= atMs) k++;
  while (k > 0 && occurrenceAt(rule, k) > atMs) k--;
  return occurrenceAt(rule, k);
}

/** Occurrences (epoch ms) dont la date locale est dans [fromDate, toDate] inclus, triées. */
export function occurrencesBetween(rule: RecurrenceRule, fromDate: LocalDate, toDate: LocalDate): EpochMs[] {
  if (fromDate > toDate) return [];
  const out: EpochMs[] = [];
  if (rule.recurrence === 'none') {
    const d = occurrenceDate(rule, 0);
    return d >= fromDate && d <= toDate ? [occurrenceAt(rule, 0)] : out;
  }
  let k = Math.max(0, estimateIndex(rule, fromDate) - 2);
  for (; ; k++) {
    const d = occurrenceDate(rule, k);
    if (d > toDate) break;
    if (d >= fromDate) out.push(occurrenceAt(rule, k));
  }
  return out;
}
