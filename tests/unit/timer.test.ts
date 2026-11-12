import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/data/db';
import { taskService } from '@/data/services/tasks';
import { timerService } from '@/data/services/timer';
import { exportBackupJson, importBackupJson } from '@/data/services/backup';
import { toEpochMs } from '@/domain/dates';
import { dayMsByTask, splitByDay, totalMs } from '@/domain/time-sessions';
import { formatDuration } from '@/lib/format';
import type { TimeSession } from '@/domain/types';

const at = toEpochMs;
const MIN = 60_000;
const D1 = '2026-05-01';
const D2 = '2026-05-02';
const tin = { title: 'T', startDate: D1, endDate: '2026-05-05' };

const mk = async () => {
  const r = await taskService.create(tin);
  if (!r.ok) throw new Error('create');
  return r.value;
};
const sess = (taskId: string, start: number, end?: number): TimeSession => ({ id: `${taskId}-${start}`, taskId, start, end });

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(at(D1, '08:00'));
  await Promise.all(db.tables.map((t) => t.clear()));
});
afterEach(() => vi.useRealTimers());

describe('chrono : start / pause / stop', () => {
  it('start ouvre une session, pause la clôt et garde la tâche en pause, start reprend', async () => {
    const t = await mk();
    expect((await timerService.start(t.id)).ok).toBe(true);
    expect(await db.timeSessions.toArray()).toMatchObject([{ taskId: t.id, start: at(D1, '08:00') }]);
    vi.setSystemTime(at(D1, '08:10'));
    await timerService.pause();
    const [s] = await db.timeSessions.toArray();
    expect(s.end).toBe(at(D1, '08:10'));
    expect(await timerService.getPausedTaskId()).toBe(t.id);
    await timerService.start(t.id);
    expect(await timerService.getPausedTaskId()).toBeNull();
    expect(await db.timeSessions.count()).toBe(2);
  });
  it('stop clôt et efface la pause ; pause sans session ne change rien', async () => {
    const t = await mk();
    await timerService.pause();
    expect(await timerService.getPausedTaskId()).toBeNull();
    await timerService.start(t.id);
    await timerService.pause();
    await timerService.stop();
    expect(await timerService.getPausedTaskId()).toBeNull();
  });
  it('un second start clôt la session précédente', async () => {
    const a = await mk();
    const b = await mk();
    await timerService.start(a.id);
    vi.setSystemTime(at(D1, '08:30'));
    await timerService.start(b.id);
    const rows = await db.timeSessions.toArray();
    expect(rows.filter((r) => r.end === undefined)).toHaveLength(1);
    expect(rows.find((r) => r.taskId === a.id)?.end).toBe(at(D1, '08:30'));
  });
  it('start refusé sur tâche done ou inexistante', async () => {
    const t = await mk();
    await taskService.update(t.id, { status: 'done' });
    expect((await timerService.start(t.id)).ok).toBe(false);
    expect((await timerService.start('nope')).ok).toBe(false);
    expect(await db.timeSessions.count()).toBe(0);
  });
});

describe('sessions et tâches', () => {
  it('update vers done clôt la session ouverte', async () => {
    const t = await mk();
    await timerService.start(t.id);
    vi.setSystemTime(at(D1, '09:00'));
    await taskService.update(t.id, { status: 'done' });
    expect((await db.timeSessions.toArray())[0].end).toBe(at(D1, '09:00'));
  });
  it('move vers done clôt la session ouverte', async () => {
    const t = await mk();
    await timerService.start(t.id);
    vi.setSystemTime(at(D1, '09:00'));
    await taskService.move(t.id, 'done');
    expect((await db.timeSessions.toArray())[0].end).toBe(at(D1, '09:00'));
  });
  it('remove supprime les sessions de la tâche uniquement', async () => {
    const a = await mk();
    const b = await mk();
    await db.timeSessions.bulkAdd([sess(a.id, 1, 2), sess(b.id, 1, 2)]);
    await taskService.remove(a.id);
    expect((await db.timeSessions.toArray()).map((s) => s.taskId)).toEqual([b.id]);
  });
});

describe('calculs purs', () => {
  it('done et remove effacent la pause de la tâche (non-régression)', async () => {
    const a = await mk();
    await timerService.start(a.id);
    await timerService.pause();
    await taskService.move(a.id, 'done');
    expect(await timerService.getPausedTaskId()).toBeNull();
    const b = await mk();
    await timerService.start(b.id);
    await timerService.pause();
    await taskService.remove(b.id);
    expect(await timerService.getPausedTaskId()).toBeNull();
  });

  it('splitByDay 23:00 -> 01:00 = 60/60', () => {
    expect(splitByDay(sess('a', at(D1, '23:00'), at(D2, '01:00')), 0)).toEqual([
      { date: D1, ms: 60 * MIN },
      { date: D2, ms: 60 * MIN },
    ]);
  });
  it('session ouverte jusqu\'à now ; end < start borné à 0', () => {
    expect(splitByDay(sess('a', at(D1, '10:00')), at(D1, '10:05'))).toEqual([{ date: D1, ms: 5 * MIN }]);
    expect(splitByDay(sess('a', 100, 50), 0)).toEqual([]);
    expect(totalMs([sess('a', 100, 50)], 0)).toBe(0);
  });
  it('totalMs et dayMsByTask', () => {
    const l = [sess('a', at(D1, '23:00'), at(D2, '01:00')), sess('a', at(D2, '10:00'), at(D2, '10:30')), sess('b', at(D2, '11:00'))];
    const now = at(D2, '11:10');
    expect(totalMs(l, now)).toBe((120 + 30 + 10) * MIN);
    expect(dayMsByTask(l, D2, now)).toEqual(new Map([['a', 90 * MIN], ['b', 10 * MIN]]));
    expect(dayMsByTask(l, D1, now)).toEqual(new Map([['a', 60 * MIN]]));
  });
  it('formatDuration', () => {
    expect(formatDuration(65 * MIN)).toBe('1 h 05');
    expect(formatDuration(12 * MIN + 3000)).toBe('12 min 03 s');
    expect(formatDuration(-5)).toBe('0 s');
  });
});

describe('resetDay', () => {
  it('ne touche que le jour et la tâche visés, rogne la part du jour à minuit', async () => {
    await db.timeSessions.bulkAdd([
      sess('a', at(D1, '09:00'), at(D1, '10:00')), // supprimée
      sess('a', at(D2, '09:00'), at(D2, '10:00')), // autre jour
      sess('b', at(D1, '09:00'), at(D1, '10:00')), // autre tâche
      sess('a', at(D1, '23:00'), at(D2, '01:00')), // rognée
    ]);
    await timerService.resetDay('a', D1);
    expect(await db.timeSessions.count()).toBe(3);
    const rest = await db.timeSessions.where('taskId').equals('a').toArray();
    expect(dayMsByTask(rest, D1, 0).get('a')).toBeUndefined();
    expect(dayMsByTask(rest, D2, 0).get('a')).toBe(120 * MIN); // 01:00 rognée + 09:00-10:00 intacte
    expect((await db.timeSessions.where('taskId').equals('b').toArray())).toHaveLength(1);
  });
});

describe('sauvegarde', () => {
  it('export/import avec timeSessions', async () => {
    const t = await mk();
    await db.timeSessions.add(sess(t.id, 1, 2));
    const json = await exportBackupJson();
    await db.timeSessions.clear();
    const r = await importBackupJson(json);
    expect(r).toMatchObject({ ok: true, counts: { timeSessions: 1 } });
    expect(await db.timeSessions.count()).toBe(1);
  });
  it('backup v1 sans timeSessions (avec planSlots) importable', async () => {
    const data = { reminders: [], reminderEvents: [], tasks: [], subtasks: [], comments: [], planSlots: [{ id: 'x' }], settings: [] };
    await db.timeSessions.add(sess('a', 1, 2));
    const r = await importBackupJson(JSON.stringify({ app: 'reminder', version: 1, exportedAt: 0, data }));
    expect(r).toMatchObject({ ok: true, counts: { timeSessions: 0 } });
    expect(await db.timeSessions.count()).toBe(0);
  });
});
