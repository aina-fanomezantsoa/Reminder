import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/data/db';
import { taskService } from '@/data/services/tasks';
import { planSlotService } from '@/data/services/plan-slots';
import { applyTaskRules, positionBetween } from '@/domain/task-rules';
import { findOverlaps, slotsOverlap } from '@/domain/slots';
import { slotInputSchema, taskInputSchema, validate } from '@/domain/schemas';
import type { Reminder, Task } from '@/domain/types';

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

const input = { title: 'Refonte', startDate: '2026-05-01', endDate: '2026-05-10' };
async function mk(o: Partial<Parameters<typeof taskService.create>[0]> = {}) {
  const r = await taskService.create({ ...input, ...o });
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.value;
}

describe('schémas', () => {
  it('titre vide / trop long / dates obligatoires / fin < début', () => {
    expect(validate(taskInputSchema, { ...input, title: '   ' })).toMatchObject({ ok: false, errors: { title: expect.any(String) } });
    expect(validate(taskInputSchema, { ...input, title: 'x'.repeat(201) }).ok).toBe(false);
    expect(validate(taskInputSchema, { title: 'a' })).toMatchObject({ ok: false, errors: { startDate: expect.any(String), endDate: expect.any(String) } });
    expect(validate(taskInputSchema, { ...input, endDate: '2026-04-30' })).toMatchObject({ ok: false, errors: { endDate: expect.stringContaining('précéder') } });
    expect(validate(taskInputSchema, { ...input, startDate: '2026-02-30' }).ok).toBe(false);
  });
  it('progression entier 0..100', () => {
    for (const p of [-1, 101, 5.5]) expect(validate(taskInputSchema, { ...input, progress: p }).ok).toBe(false);
    expect(validate(taskInputSchema, { ...input, progress: 100 }).ok).toBe(true);
  });
  it('créneau : fin > début, format HH:mm', () => {
    const s = { date: '2026-05-01', start: '10:00', end: '10:00', title: 'x' };
    expect(validate(slotInputSchema, s)).toMatchObject({ ok: false, errors: { end: expect.any(String) } });
    expect(validate(slotInputSchema, { ...s, start: '25:00' }).ok).toBe(false);
    expect(validate(slotInputSchema, { ...s, end: '10:01' }).ok).toBe(true);
  });
});

describe('task-rules', () => {
  const base: Task = { id: 'a', title: 't', status: 'in_progress', progress: 40, starred: false, startDate: '2026-01-01', endDate: '2026-01-02', position: 1, createdAt: 1, updatedAt: 1 };
  it('done => 100 % + completedAt ; quitter done retire completedAt et garde la progression', () => {
    const done = applyTaskRules(base, { ...base, status: 'done' }, 500);
    expect(done).toMatchObject({ progress: 100, completedAt: 500 });
    const again = applyTaskRules(done, { ...done, title: 'x' }, 900);
    expect(again.completedAt).toBe(500);
    const back = applyTaskRules(done, { ...done, status: 'editing' }, 900);
    expect(back.completedAt).toBeUndefined();
    expect(back.progress).toBe(100);
  });
  it('positionBetween', () => {
    expect(positionBetween(undefined, undefined)).toBe(1);
    expect(positionBetween(undefined, 3)).toBe(2);
    expect(positionBetween(3, undefined)).toBe(4);
    expect(positionBetween(1, 2)).toBe(1.5);
    expect(positionBetween(1, 1 + Number.EPSILON)).toBeNull();
  });
});

describe('service tâches', () => {
  it('create : défauts, validation sans exception', async () => {
    const t = await mk();
    expect(t).toMatchObject({ status: 'draft', progress: 0, starred: false });
    expect(await taskService.create({ ...input, title: '' })).toMatchObject({ ok: false });
    expect(await db.tasks.count()).toBe(1);
  });
  it('create en Terminé force 100 % et completedAt', async () => {
    const t = await mk({ status: 'done', progress: 10 });
    expect(t.progress).toBe(100);
    expect(t.completedAt).toBeTypeOf('number');
  });
  it('update : Terminé puis retour', async () => {
    const t = await mk({ progress: 30 });
    const r = await taskService.update(t.id, { status: 'done' });
    expect(r).toMatchObject({ ok: true, value: { progress: 100 } });
    const r2 = await taskService.update(t.id, { status: 'in_progress' });
    expect(r2.ok && r2.value.completedAt).toBeUndefined();
    expect(r2.ok && r2.value.progress).toBe(100);
  });
  it('update : valide la cohérence des dates sur l\'objet fusionné', async () => {
    const t = await mk();
    expect(await taskService.update(t.id, { endDate: '2026-04-01' })).toMatchObject({ ok: false, errors: { endDate: expect.any(String) } });
    expect(await taskService.update(t.id, { progress: 120 })).toMatchObject({ ok: false });
    expect((await taskService.get(t.id))?.endDate).toBe('2026-05-10');
  });
  it('update inconnu => erreur, pas d\'exception', async () => {
    expect((await taskService.update('nope', { title: 'x' })).ok).toBe(false);
  });
  it('move : changement de colonne et réordonnancement', async () => {
    const a = await mk({ title: 'A' });
    const b = await mk({ title: 'B' });
    const c = await mk({ title: 'C' });
    await taskService.move(c.id, 'draft', a.id); // C avant A
    let order = (await db.tasks.toArray()).sort((x, y) => x.position - y.position).map((t) => t.title);
    expect(order).toEqual(['C', 'A', 'B']);
    await taskService.move(a.id, 'in_progress');
    await taskService.move(b.id, 'in_progress'); // fin de colonne
    const inProg = (await db.tasks.toArray()).filter((t) => t.status === 'in_progress').sort((x, y) => x.position - y.position);
    expect(inProg.map((t) => t.title)).toEqual(['A', 'B']);
    await taskService.move(b.id, 'in_progress', a.id);
    const re = (await db.tasks.toArray()).filter((t) => t.status === 'in_progress').sort((x, y) => x.position - y.position);
    expect(re.map((t) => t.title)).toEqual(['B', 'A']);
    order = [];
  });
  it('move vers Terminé applique les règles', async () => {
    const a = await mk();
    await taskService.move(a.id, 'done');
    expect(await taskService.get(a.id)).toMatchObject({ status: 'done', progress: 100, completedAt: expect.any(Number) });
  });
  it('move : rééquilibre quand l\'écart de positions est épuisé', async () => {
    const a = await mk({ title: 'A' });
    const b = await mk({ title: 'B' });
    await db.tasks.update(a.id, { position: 1 });
    await db.tasks.update(b.id, { position: 1 + Number.EPSILON });
    const c = await mk({ title: 'C' });
    await taskService.move(c.id, 'draft', b.id);
    const col = (await db.tasks.toArray()).sort((x, y) => x.position - y.position).map((t) => t.title);
    expect(col).toEqual(['A', 'C', 'B']);
  });
  it('toggleStar', async () => {
    const t = await mk();
    await taskService.toggleStar(t.id);
    expect((await taskService.get(t.id))?.starred).toBe(true);
    await taskService.toggleStar(t.id);
    expect((await taskService.get(t.id))?.starred).toBe(false);
  });
  it('sous-tâches : ajout, validation, rename, toggle, suppression, ne change pas la progression', async () => {
    const t = await mk({ progress: 20 });
    expect(await taskService.addSubtask(t.id, '  ')).toMatchObject({ ok: false, errors: { title: expect.any(String) } });
    const s1 = await taskService.addSubtask(t.id, 'Un');
    const s2 = await taskService.addSubtask(t.id, 'Deux');
    if (!s1.ok || !s2.ok) throw new Error();
    expect(s2.value.position).toBeGreaterThan(s1.value.position);
    await taskService.toggleSubtask(s1.value.id);
    expect((await taskService.subtasksOf(t.id))[0].done).toBe(true);
    expect(await taskService.renameSubtask(s1.value.id, 'Uno')).toMatchObject({ ok: true, value: { title: 'Uno' } });
    expect(await taskService.renameSubtask(s1.value.id, '')).toMatchObject({ ok: false });
    await taskService.removeSubtask(s2.value.id);
    expect(await taskService.subtasksOf(t.id)).toHaveLength(1);
    expect((await taskService.get(t.id))?.progress).toBe(20);
    expect((await taskService.addSubtask('nope', 'x')).ok).toBe(false);
  });
  it('commentaires', async () => {
    const t = await mk();
    expect((await taskService.addComment(t.id, ' ')).ok).toBe(false);
    expect((await taskService.addComment(t.id, 'Bonjour')).ok).toBe(true);
    expect(await taskService.commentsOf(t.id)).toHaveLength(1);
  });
  it('remove : cascade, rappels et créneaux détachés mais conservés', async () => {
    const t = await mk();
    await taskService.addSubtask(t.id, 's');
    await taskService.addComment(t.id, 'c');
    const rem: Reminder = { id: 'r1', title: 'R', startDate: '2026-05-01', time: '09:00', recurrence: 'none', taskId: t.id, nextDueAt: 1, createdAt: 1, updatedAt: 1 };
    await db.reminders.add(rem);
    const slot = await planSlotService.create({ date: '2026-05-01', start: '09:00', end: '10:00', title: 'Slot', taskId: t.id });
    expect(slot.ok).toBe(true);
    expect(await taskService.remindersOf(t.id)).toHaveLength(1);
    await taskService.remove(t.id);
    expect(await db.tasks.count()).toBe(0);
    expect(await db.subtasks.count()).toBe(0);
    expect(await db.comments.count()).toBe(0);
    const r = await db.reminders.get('r1');
    expect(r).toBeDefined();
    expect(r?.taskId).toBeUndefined();
    const s = (await db.planSlots.toArray())[0];
    expect(s.title).toBe('Slot');
    expect(s.taskId).toBeUndefined();
  });
});

describe('créneaux : chevauchement', () => {
  const s = (start: string, end: string, date = '2026-05-01') => ({ date, start, end });
  it('slotsOverlap : intersection stricte, bornes jointives OK, jours différents OK', () => {
    expect(slotsOverlap(s('09:00', '10:00'), s('09:30', '10:30'))).toBe(true);
    expect(slotsOverlap(s('09:00', '12:00'), s('10:00', '11:00'))).toBe(true);
    expect(slotsOverlap(s('09:00', '10:00'), s('10:00', '11:00'))).toBe(false);
    expect(slotsOverlap(s('09:00', '10:00'), s('08:00', '09:00'))).toBe(false);
    expect(slotsOverlap(s('09:00', '10:00'), s('09:00', '10:00', '2026-05-02'))).toBe(false);
  });
  it('findOverlaps ignore le créneau modifié', () => {
    const ex = [{ id: 'a', title: 'a', ...s('09:00', '10:00') }];
    expect(findOverlaps(ex, { ...s('09:15', '09:45'), title: 'n' })).toHaveLength(1);
    expect(findOverlaps(ex, { ...s('09:15', '09:45'), title: 'n' }, 'a')).toHaveLength(0);
  });
  it('service : overlaps = true (avertissement, pas d\'erreur), 2e jour libre', async () => {
    const a = await planSlotService.create({ ...s('09:00', '10:00'), title: 'A' });
    expect(a).toMatchObject({ ok: true, value: { overlaps: false } });
    const b = await planSlotService.create({ ...s('09:30', '10:30'), title: 'B' });
    expect(b).toMatchObject({ ok: true, value: { overlaps: true } });
    const c = await planSlotService.create({ ...s('10:30', '11:00'), title: 'C' });
    expect(c).toMatchObject({ ok: true, value: { overlaps: false } });
    const d = await planSlotService.create({ ...s('09:30', '10:30', '2026-05-02'), title: 'D' });
    expect(d).toMatchObject({ ok: true, value: { overlaps: false } });
    expect(await db.planSlots.count()).toBe(4);
  });
  it('update : ne se chevauche pas avec lui-même ; chevauchement détecté après déplacement', async () => {
    const a = await planSlotService.create({ ...s('09:00', '10:00'), title: 'A' });
    const b = await planSlotService.create({ ...s('11:00', '12:00'), title: 'B' });
    if (!a.ok || !b.ok) throw new Error();
    expect(await planSlotService.update(a.value.id, { ...s('09:15', '09:45'), title: 'A' })).toMatchObject({ ok: true, value: { overlaps: false } });
    expect(await planSlotService.update(a.value.id, { ...s('11:30', '11:45'), title: 'A' })).toMatchObject({ ok: true, value: { overlaps: true } });
    expect((await planSlotService.update('nope', { ...s('09:00', '10:00'), title: 'x' })).ok).toBe(false);
  });
  it('validation : fin <= début refusée, tâche inexistante refusée', async () => {
    expect(await planSlotService.create({ ...s('10:00', '09:00'), title: 'x' })).toMatchObject({ ok: false, errors: { end: expect.any(String) } });
    expect(await planSlotService.create({ ...s('09:00', '10:00'), title: 'x', taskId: 'nope' })).toMatchObject({ ok: false, errors: { taskId: expect.any(String) } });
  });
  it('listByDate trié par heure ; remove', async () => {
    await planSlotService.create({ ...s('14:00', '15:00'), title: 'tard' });
    const early = await planSlotService.create({ ...s('08:00', '09:00'), title: 'tôt' });
    expect((await planSlotService.listByDate('2026-05-01')).map((x) => x.title)).toEqual(['tôt', 'tard']);
    if (early.ok) await planSlotService.remove(early.value.id);
    expect(await planSlotService.listByDate('2026-05-01')).toHaveLength(1);
  });
});
