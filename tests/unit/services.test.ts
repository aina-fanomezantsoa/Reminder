import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/data/db';
import { taskService } from '@/data/services/tasks';
import { applyTaskRules, positionBetween } from '@/domain/task-rules';
import { taskInputSchema, validate } from '@/domain/schemas';
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
  it('sous-tâches : la progression suit les sous-tâches cochées', async () => {
    const t = await mk({ progress: 20 });
    const a = await taskService.addSubtask(t.id, 'A');
    const b = await taskService.addSubtask(t.id, 'B');
    if (!a.ok || !b.ok) throw new Error();
    expect((await taskService.get(t.id))?.progress).toBe(0);
    await taskService.toggleSubtask(a.value.id);
    expect(await taskService.get(t.id)).toMatchObject({ progress: 50, status: 'in_progress' });
    await taskService.toggleSubtask(b.value.id);
    expect(await taskService.get(t.id)).toMatchObject({ progress: 100, status: 'done', completedAt: expect.any(Number) });
    await taskService.removeSubtask(b.value.id);
    expect((await taskService.get(t.id))?.progress).toBe(100);
  });
  it('sous-tâches : 1 cochée → en cours, 2 cochées → édition, toutes → terminée, décocher recule', async () => {
    const t = await mk();
    const ids: string[] = [];
    for (const n of ['A', 'B', 'C', 'D']) {
      const r = await taskService.addSubtask(t.id, n);
      if (!r.ok) throw new Error();
      ids.push(r.value.id);
    }
    const status = async () => (await taskService.get(t.id))?.status;
    await taskService.toggleSubtask(ids[0]);
    expect(await status()).toBe('in_progress');
    await taskService.toggleSubtask(ids[1]);
    expect(await status()).toBe('editing');
    await taskService.toggleSubtask(ids[2]);
    await taskService.toggleSubtask(ids[3]);
    expect(await status()).toBe('done');
    await taskService.toggleSubtask(ids[3]);
    expect(await taskService.get(t.id)).toMatchObject({ status: 'editing', progress: 75 });
  });
  it('sous-tâches : ajout, validation, rename, toggle, suppression', async () => {
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
    expect((await taskService.addSubtask('nope', 'x')).ok).toBe(false);
  });
  it('commentaires', async () => {
    const t = await mk();
    expect((await taskService.addComment(t.id, ' ')).ok).toBe(false);
    expect((await taskService.addComment(t.id, 'Bonjour')).ok).toBe(true);
    expect(await taskService.commentsOf(t.id)).toHaveLength(1);
  });
  it('remove : cascade, rappels détachés mais conservés', async () => {
    const t = await mk();
    await taskService.addSubtask(t.id, 's');
    await taskService.addComment(t.id, 'c');
    const rem: Reminder = { id: 'r1', title: 'R', startDate: '2026-05-01', time: '09:00', recurrence: 'none', taskId: t.id, nextDueAt: 1, createdAt: 1, updatedAt: 1 };
    await db.reminders.add(rem);
    expect(await taskService.remindersOf(t.id)).toHaveLength(1);
    await taskService.remove(t.id);
    expect(await db.tasks.count()).toBe(0);
    expect(await db.subtasks.count()).toBe(0);
    expect(await db.comments.count()).toBe(0);
    const r = await db.reminders.get('r1');
    expect(r).toBeDefined();
    expect(r?.taskId).toBeUndefined();
  });
});
