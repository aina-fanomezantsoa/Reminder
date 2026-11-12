import { describe, expect, it } from 'vitest';
import { latestOccurrenceAtOrBefore, nextOccurrenceAfter, occurrenceAt, occurrenceDate, occurrencesBetween, type RecurrenceRule } from '@/domain/recurrence';
import { fromEpochMs, toEpochMs } from '@/domain/dates';

const rule = (startDate: string, recurrence: RecurrenceRule['recurrence'], time = '09:00'): RecurrenceRule => ({
  startDate,
  time,
  recurrence,
});
const fmt = (ms: number | null) => (ms === null ? null : `${fromEpochMs(ms).date} ${fromEpochMs(ms).time}`);

describe('recurrence none', () => {
  const r = rule('2026-03-10', 'none');
  it("renvoie l'unique occurrence si future, sinon null", () => {
    expect(fmt(nextOccurrenceAfter(r, toEpochMs('2026-03-10', '08:59')))).toBe('2026-03-10 09:00');
    expect(nextOccurrenceAfter(r, toEpochMs('2026-03-10', '09:00'))).toBeNull(); // strictement après
    expect(nextOccurrenceAfter(r, toEpochMs('2027-01-01', '00:00'))).toBeNull();
  });
  it('occurrencesBetween', () => {
    expect(occurrencesBetween(r, '2026-03-01', '2026-03-31')).toHaveLength(1);
    expect(occurrencesBetween(r, '2026-03-11', '2026-03-31')).toHaveLength(0);
    expect(occurrencesBetween(r, '2026-03-10', '2026-03-10')).toHaveLength(1);
  });
});

describe('daily', () => {
  const r = rule('2026-01-30', 'daily', '07:30');
  it("+k jours, passage de mois et d'année", () => {
    expect(occurrenceDate(r, 0)).toBe('2026-01-30');
    expect(occurrenceDate(r, 2)).toBe('2026-02-01');
    expect(occurrenceDate(rule('2026-12-31', 'daily'), 1)).toBe('2027-01-01');
  });
  it('année bissextile', () => {
    expect(occurrenceDate(rule('2028-02-28', 'daily'), 1)).toBe('2028-02-29');
    expect(occurrenceDate(rule('2028-02-28', 'daily'), 2)).toBe('2028-03-01');
    expect(occurrenceDate(rule('2026-02-28', 'daily'), 1)).toBe('2026-03-01');
  });
  it('nextOccurrenceAfter avant, pile sur, après', () => {
    expect(fmt(nextOccurrenceAfter(r, toEpochMs('2026-01-01', '00:00')))).toBe('2026-01-30 07:30');
    expect(fmt(nextOccurrenceAfter(r, toEpochMs('2026-01-30', '07:30')))).toBe('2026-01-31 07:30');
    expect(fmt(nextOccurrenceAfter(r, toEpochMs('2026-01-30', '07:31')))).toBe('2026-01-31 07:30');
    expect(fmt(nextOccurrenceAfter(r, toEpochMs('2026-06-15', '12:00')))).toBe('2026-06-16 07:30');
    expect(fmt(nextOccurrenceAfter(r, toEpochMs('2026-06-15', '07:00')))).toBe('2026-06-15 07:30');
  });
  it('occurrencesBetween inclusif', () => {
    const list = occurrencesBetween(r, '2026-02-01', '2026-02-07');
    expect(list).toHaveLength(7);
    expect(fmt(list[0])).toBe('2026-02-01 07:30');
    expect(fmt(list[6])).toBe('2026-02-07 07:30');
    expect(occurrencesBetween(r, '2026-01-01', '2026-01-29')).toHaveLength(0);
    expect(occurrencesBetween(r, '2026-02-07', '2026-02-01')).toEqual([]);
  });
});

describe('weekly', () => {
  const r = rule('2026-03-02', 'weekly'); // lundi
  it('+7k jours, même jour de semaine', () => {
    expect(occurrenceDate(r, 1)).toBe('2026-03-09');
    expect(occurrenceDate(r, 5)).toBe('2026-04-06');
    for (let k = 0; k < 60; k++) {
      expect(new Date(occurrenceAt(r, k)).getDay()).toBe(1);
    }
  });
  it('nextOccurrenceAfter', () => {
    expect(fmt(nextOccurrenceAfter(r, toEpochMs('2026-03-02', '09:00')))).toBe('2026-03-09 09:00');
    expect(fmt(nextOccurrenceAfter(r, toEpochMs('2026-03-05', '10:00')))).toBe('2026-03-09 09:00');
    expect(fmt(nextOccurrenceAfter(r, toEpochMs('2027-03-01', '08:00')))).toBe('2027-03-01 09:00');
    expect(fmt(nextOccurrenceAfter(r, toEpochMs('2027-03-02', '08:00')))).toBe('2027-03-08 09:00');
  });
  it('occurrencesBetween sur un mois', () => {
    const list = occurrencesBetween(r, '2026-03-01', '2026-03-31');
    expect(list.map((m) => fromEpochMs(m).date)).toEqual(['2026-03-02', '2026-03-09', '2026-03-16', '2026-03-23', '2026-03-30']);
  });
});

describe('monthly (fin de mois)', () => {
  it('31 janvier : 28 février, puis retour au 31 mars (CA-R4.4)', () => {
    const r = rule('2026-01-31', 'monthly');
    expect([0, 1, 2, 3, 4].map((k) => occurrenceDate(r, k))).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31']);
  });
  it('année bissextile : 29 février 2028', () => {
    const r = rule('2028-01-31', 'monthly');
    expect(occurrenceDate(r, 1)).toBe('2028-02-29');
    expect(occurrenceDate(r, 2)).toBe('2028-03-31');
  });
  it('ancre au 29 / 30', () => {
    expect(occurrenceDate(rule('2026-01-29', 'monthly'), 1)).toBe('2026-02-28');
    expect(occurrenceDate(rule('2026-01-30', 'monthly'), 1)).toBe('2026-02-28');
    expect(occurrenceDate(rule('2026-01-30', 'monthly'), 2)).toBe('2026-03-30');
    expect(occurrenceDate(rule('2028-01-29', 'monthly'), 1)).toBe('2028-02-29');
  });
  it("passage d'année", () => {
    const r = rule('2026-11-15', 'monthly');
    expect(occurrenceDate(r, 2)).toBe('2027-01-15');
    expect(occurrenceDate(r, 14)).toBe('2028-01-15');
  });
  it("nextOccurrenceAfter ne dérive pas (depuis l'ancre)", () => {
    const r = rule('2026-01-31', 'monthly');
    expect(fmt(nextOccurrenceAfter(r, toEpochMs('2026-01-31', '09:00')))).toBe('2026-02-28 09:00');
    expect(fmt(nextOccurrenceAfter(r, toEpochMs('2026-02-28', '09:00')))).toBe('2026-03-31 09:00');
    expect(fmt(nextOccurrenceAfter(r, toEpochMs('2026-03-01', '00:00')))).toBe('2026-03-31 09:00');
    expect(fmt(nextOccurrenceAfter(r, toEpochMs('2027-02-10', '00:00')))).toBe('2027-02-28 09:00');
    expect(fmt(nextOccurrenceAfter(r, toEpochMs('2030-12-31', '09:00')))).toBe('2031-01-31 09:00');
  });
  it('occurrencesBetween : une seule par mois, clamp inclus', () => {
    const r = rule('2026-01-31', 'monthly');
    expect(occurrencesBetween(r, '2026-02-01', '2026-02-28').map((m) => fromEpochMs(m).date)).toEqual(['2026-02-28']);
    expect(occurrencesBetween(r, '2026-02-01', '2026-02-27')).toEqual([]);
    expect(occurrencesBetween(r, '2026-01-01', '2026-04-30').map((m) => fromEpochMs(m).date)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  });
});

describe("heure locale et changement d'heure", () => {
  it("conserve l'heure affichée après le passage à l'heure d'été (Europe/Paris, 29 mars 2026)", () => {
    const r = rule('2026-03-27', 'daily', '09:00');
    for (let k = 0; k < 5; k++) expect(fromEpochMs(occurrenceAt(r, k)).time).toBe('09:00');
    expect(occurrencesBetween(r, '2026-03-27', '2026-03-31')).toHaveLength(5);
  });
  it("conserve l'heure après le retour à l'heure d'hiver (25 octobre 2026)", () => {
    const r = rule('2026-10-23', 'daily', '23:30');
    for (let k = 0; k < 5; k++) expect(fromEpochMs(occurrenceAt(r, k)).time).toBe('23:30');
  });
});

describe('latestOccurrenceAtOrBefore (rattrapage)', () => {
  it('none', () => {
    const r = rule('2026-03-10', 'none');
    expect(latestOccurrenceAtOrBefore(r, toEpochMs('2026-03-09', '23:59'))).toBeNull();
    expect(fmt(latestOccurrenceAtOrBefore(r, toEpochMs('2026-03-10', '09:00')))).toBe('2026-03-10 09:00');
    expect(fmt(latestOccurrenceAtOrBefore(r, toEpochMs('2027-01-01', '00:00')))).toBe('2026-03-10 09:00');
  });
  it('quotidien / mensuel : plus récente échue', () => {
    expect(fmt(latestOccurrenceAtOrBefore(rule('2026-01-01', 'daily'), toEpochMs('2026-01-10', '08:00')))).toBe('2026-01-09 09:00');
    expect(fmt(latestOccurrenceAtOrBefore(rule('2026-01-01', 'daily'), toEpochMs('2026-01-10', '09:00')))).toBe('2026-01-10 09:00');
    expect(fmt(latestOccurrenceAtOrBefore(rule('2026-01-31', 'monthly'), toEpochMs('2026-03-30', '12:00')))).toBe('2026-02-28 09:00');
    expect(latestOccurrenceAtOrBefore(rule('2026-05-01', 'weekly'), toEpochMs('2026-04-30', '12:00'))).toBeNull();
  });
});

describe('cohérence next / between sur de longues plages', () => {
  it.each(['daily', 'weekly', 'monthly'] as const)('%s : next enchaîne toutes les occurrences', (freq) => {
    const r = rule('2026-01-31', freq, '06:15');
    const all = occurrencesBetween(r, '2026-01-01', '2028-12-31');
    let cur = nextOccurrenceAfter(r, toEpochMs('2026-01-01', '00:00'));
    const chained: number[] = [];
    while (cur !== null && fromEpochMs(cur).date <= '2028-12-31') {
      chained.push(cur);
      cur = nextOccurrenceAfter(r, cur);
    }
    expect(chained).toEqual(all);
  });
});
