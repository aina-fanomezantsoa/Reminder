import { describe, expect, it } from 'vitest';
import { completedPerDay, computeRings } from '@/domain/stats';
import { toEpochMs } from '@/domain/dates';
import type { Task } from '@/domain/types';

let n = 0;
const task = (o: Partial<Task> = {}): Task => ({
  id: `t${++n}`,
  title: `Tâche ${n}`,
  status: 'in_progress',
  progress: 0,
  starred: false,
  startDate: '2026-05-01',
  endDate: '2026-05-30',
  position: n,
  createdAt: 1,
  updatedAt: 1,
  ...o,
});

describe('computeRings', () => {
  it('[] si aucune tâche ou limit <= 0', () => {
    expect(computeRings([], 4)).toEqual([]);
    expect(computeRings([task()], 0)).toEqual([]);
  });
  it('percent = progress, label = titre', () => {
    expect(computeRings([task({ id: 'a', title: 'Refonte', progress: 75 })], 4)).toEqual([{ taskId: 'a', label: 'Refonte', percent: 75 }]);
  });
  it('tri : non terminées, puis favoris, puis updatedAt décroissant', () => {
    const done = task({ id: 'done', status: 'done', progress: 100, starred: true, updatedAt: 999 });
    const old = task({ id: 'old', updatedAt: 10 });
    const recent = task({ id: 'recent', updatedAt: 50 });
    const star = task({ id: 'star', starred: true, updatedAt: 1 });
    expect(computeRings([done, old, recent, star], 10).map((r) => r.taskId)).toEqual(['star', 'recent', 'old', 'done']);
  });
  it("applique la limite (4 et 8) ; les terminées ne comblent que s'il manque des actives", () => {
    const tasks = Array.from({ length: 10 }, (_, i) => task({ id: `x${i}`, updatedAt: i }));
    expect(computeRings(tasks, 4)).toHaveLength(4);
    expect(computeRings(tasks, 8)).toHaveLength(8);
    const mixed = [task({ id: 'a' }), task({ id: 'd', status: 'done', progress: 100 })];
    expect(computeRings(mixed, 1).map((r) => r.taskId)).toEqual(['a']);
    expect(computeRings(mixed, 4)).toHaveLength(2);
  });
  it("ne mute pas l'entrée", () => {
    const tasks = [task({ updatedAt: 1 }), task({ updatedAt: 2 })];
    const copy = [...tasks];
    computeRings(tasks, 4);
    expect(tasks).toEqual(copy);
  });
});

describe('completedPerDay', () => {
  const today = '2026-05-15';
  const doneAt = (date: string, time = '12:00', o: Partial<Task> = {}) => task({ status: 'done', progress: 100, completedAt: toEpochMs(date, time), ...o });

  it("7 jours consécutifs, aujourd'hui à droite", () => {
    const r = completedPerDay([], 7, today);
    expect(r).toHaveLength(7);
    expect(r[0].date).toBe('2026-05-09');
    expect(r[6].date).toBe(today);
    expect(r.every((d) => d.count === 0)).toBe(true);
  });
  it('libellés français abrégés', () => {
    const r = completedPerDay([], 7, today); // 15 mai 2026 = vendredi
    expect(r[6].label).toBe('ven.');
    expect(r[5].label).toBe('jeu.');
  });
  it('compte par jour local, bornes 00:00 et 23:59 incluses', () => {
    const tasks = [doneAt('2026-05-15', '00:00'), doneAt('2026-05-15', '23:59'), doneAt('2026-05-14'), doneAt('2026-05-09')];
    const r = completedPerDay(tasks, 7, today);
    expect(r.map((d) => d.count)).toEqual([1, 0, 0, 0, 0, 1, 2]);
  });
  it('ignore hors fenêtre, non terminées et sans completedAt', () => {
    const tasks = [
      doneAt('2026-05-08'), // J-7 : hors
      doneAt('2026-05-16'), // futur : hors
      task({ status: 'in_progress', completedAt: toEpochMs('2026-05-15', '10:00') }),
      task({ status: 'done', progress: 100 }),
    ];
    expect(completedPerDay(tasks, 7, today).reduce((s, d) => s + d.count, 0)).toBe(0);
  });
  it("fin de mois / d'année", () => {
    const r = completedPerDay([doneAt('2026-12-31')], 7, '2027-01-02');
    expect(r.map((d) => d.date)).toEqual(['2026-12-27', '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
    expect(r[4].count).toBe(1);
  });
  it('days paramétrable', () => {
    expect(completedPerDay([], 3, today)).toHaveLength(3);
    expect(completedPerDay([], 0, today)).toEqual([]);
  });
});
