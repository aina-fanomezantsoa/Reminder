import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/data/db';
import { taskService } from '@/data/services/tasks';
import { planSlotService } from '@/data/services/plan-slots';
import { createReminderService } from '@/data/services/reminders';
import { exportBackupJson, importBackupJson } from '@/data/services/backup';
import { settingsService } from '@/data/services/settings';
import { processDueReminders } from '@/notifications/scheduler';
import {
  addDaysLocal,
  diffDaysLocal,
  fromEpochMs,
  isValidLocalDate,
  isValidLocalTime,
  timeToMinutes,
  toEpochMs,
} from '@/domain/dates';
import { latestOccurrenceAtOrBefore, nextOccurrenceAfter, occurrenceAt, occurrenceDate } from '@/domain/recurrence';
import { commentSchema, reminderInputSchema, subtaskTitleSchema, taskPatchSchema, validate } from '@/domain/schemas';
import { applyTaskRules, positionBetween } from '@/domain/task-rules';
import { completedPerDay, computeRings } from '@/domain/stats';
import type { ReminderInput, Task } from '@/domain/types';

const clock = { now: toEpochMs('2026-05-01', '08:00') };
const rs = createReminderService(() => clock.now);
const at = toEpochMs;
const tin = { title: 'T', startDate: '2026-05-01', endDate: '2026-05-05' };
const rin: ReminderInput = { title: 'R', startDate: '2026-05-01', time: '09:00', recurrence: 'none' };

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
  clock.now = at('2026-05-01', '08:00');
});

describe('QA dates', () => {
  it('validation date/heure', () => {
    expect(isValidLocalDate('2028-02-29')).toBe(true);
    expect(isValidLocalDate('2026-02-29')).toBe(false);
    expect(isValidLocalDate('2026-13-01')).toBe(false);
    expect(isValidLocalDate('2026-1-01')).toBe(false);
    expect(isValidLocalDate('')).toBe(false);
    expect(isValidLocalTime('24:00')).toBe(false);
    expect(isValidLocalTime('23:59')).toBe(true);
    expect(isValidLocalTime('9:00')).toBe(false);
    expect(() => timeToMinutes('xx')).toThrow();
  });
  it("addDaysLocal / diffDaysLocal a travers l'heure d'ete et l'annee", () => {
    expect(addDaysLocal('2026-03-28', 2)).toBe('2026-03-30');
    expect(addDaysLocal('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysLocal('2026-03-01', -1)).toBe('2026-02-28');
    expect(diffDaysLocal('2026-03-28', '2026-03-30')).toBe(2);
    expect(diffDaysLocal('2026-10-24', '2026-10-26')).toBe(2);
    expect(diffDaysLocal('2026-05-10', '2026-05-01')).toBe(-9);
  });
  it('toEpochMs / fromEpochMs aller-retour', () => {
    expect(fromEpochMs(at('2026-07-04', '13:07'))).toEqual({ date: '2026-07-04', time: '13:07' });
  });
});

describe('QA recurrence : cas limites', () => {
  it('hebdo : meme jour de semaine sur 60 occurrences', () => {
    const rule = { startDate: '2026-05-01', time: '09:00', recurrence: 'weekly' as const };
    for (let k = 0; k < 60; k++) expect(new Date(occurrenceAt(rule, k)).getDay()).toBe(5);
  });
  it('mensuel 30 : 28 fev, 30 mars, 30 avril', () => {
    const rule = { startDate: '2026-01-30', time: '09:00', recurrence: 'monthly' as const };
    expect([1, 2, 3].map((k) => occurrenceDate(rule, k))).toEqual(['2026-02-28', '2026-03-30', '2026-04-30']);
  });
  it("quotidien a 02:30 autour du passage a l'heure d'ete reste strictement croissant", () => {
    const rule = { startDate: '2026-03-27', time: '02:30', recurrence: 'daily' as const };
    for (let k = 0; k < 6; k++) expect(occurrenceAt(rule, k + 1)).toBeGreaterThan(occurrenceAt(rule, k));
  });
  it("nextOccurrenceAfter avant l'ancre renvoie l'ancre ; latest avant l'ancre = null", () => {
    const rule = { startDate: '2026-06-01', time: '09:00', recurrence: 'daily' as const };
    expect(nextOccurrenceAfter(rule, at('2026-01-01', '00:00'))).toBe(at('2026-06-01', '09:00'));
    expect(latestOccurrenceAtOrBefore(rule, at('2026-01-01', '00:00'))).toBeNull();
  });
  it("rattrapage apres 3 ans d'absence (quotidien)", () => {
    const rule = { startDate: '2023-01-01', time: '09:00', recurrence: 'daily' as const };
    const now = at('2026-05-01', '10:00');
    expect(latestOccurrenceAtOrBefore(rule, now)).toBe(at('2026-05-01', '09:00'));
    expect(nextOccurrenceAfter(rule, now)).toBe(at('2026-05-02', '09:00'));
  });
});

describe('QA schemas', () => {
  it('rappel : titre 200 OK, 201 KO ; note 2000 OK, 2001 KO ; heure invalide', () => {
    const ok = (o: object) => validate(reminderInputSchema, { ...rin, ...o }).ok;
    expect(ok({ title: 'x'.repeat(200) })).toBe(true);
    expect(ok({ title: 'x'.repeat(201) })).toBe(false);
    expect(ok({ note: 'n'.repeat(2000) })).toBe(true);
    expect(ok({ note: 'n'.repeat(2001) })).toBe(false);
    expect(ok({ time: '9h' })).toBe(false);
    expect(ok({ recurrence: 'yearly' })).toBe(false);
    expect(validate(reminderInputSchema, { ...rin, recurrence: undefined })).toMatchObject({ ok: true, value: { recurrence: 'none' } });
  });
  it('rappel : champs manquants => message par champ', () => {
    const r = validate(reminderInputSchema, {});
    expect(r).toMatchObject({ ok: false, errors: { title: expect.any(String), startDate: expect.any(String), time: expect.any(String) } });
  });
  it('titre rogne (trim)', () => {
    expect(validate(reminderInputSchema, { ...rin, title: '  A  ' })).toMatchObject({ ok: true, value: { title: 'A' } });
  });
  it('progression : texte, NaN, null refuses', () => {
    for (const p of ['50', Number.NaN, null]) expect(validate(taskPatchSchema, { progress: p }).ok).toBe(false);
  });
  it('sous-tache et commentaire vides refuses', () => {
    expect(validate(subtaskTitleSchema, { title: '  ' }).ok).toBe(false);
    expect(validate(commentSchema, { text: '' }).ok).toBe(false);
  });
});

describe('QA regles de tache', () => {
  const base = { title: 'a', status: 'draft' as Task['status'], progress: 20, starred: false, startDate: '2026-05-01', endDate: '2026-05-02' } as const;
  it('done conserve completedAt existant ; progress saisi < 100 force a 100', () => {
    const cur = { ...base, status: 'done' as const, progress: 100, completedAt: 111 };
    const out = applyTaskRules(cur, { ...cur, progress: 40 }, 999);
    expect(out.progress).toBe(100);
    expect(out.completedAt).toBe(111);
  });
  it('transition libre draft -> editing garde la progression', () => {
    expect(applyTaskRules(base, { ...base, status: 'editing' }, 1).progress).toBe(20);
  });
  it('positionBetween : un cote seul', () => {
    expect(positionBetween(undefined, 5)).toBe(4);
    expect(positionBetween(5, undefined)).toBe(6);
    expect(positionBetween(1, 1)).toBeNull();
  });
});

describe('QA service taches', () => {
  it('done en update : completedAt stable apres un second update', async () => {
    const r = await taskService.create(tin);
    if (!r.ok) throw new Error();
    const a = await taskService.update(r.value.id, { status: 'done' });
    if (!a.ok) throw new Error();
    await new Promise((res) => setTimeout(res, 5));
    const b = await taskService.update(a.value.id, { title: 'Renommee' });
    if (!b.ok) throw new Error();
    expect(b.value.completedAt).toBe(a.value.completedAt);
    expect(b.value.progress).toBe(100);
  });
  it('creation titre espaces refusee, aucune ligne ecrite', async () => {
    expect((await taskService.create({ ...tin, title: '   ' })).ok).toBe(false);
    expect(await db.tasks.count()).toBe(0);
  });
  it('tache d un seul jour acceptee (debut = fin)', async () => {
    expect((await taskService.create({ ...tin, endDate: tin.startDate })).ok).toBe(true);
  });
  it('update : fin avant debut via patch partiel refusee', async () => {
    const r = await taskService.create(tin);
    if (!r.ok) throw new Error();
    expect(await taskService.update(r.value.id, { endDate: '2026-04-01' })).toMatchObject({ ok: false, errors: { endDate: expect.any(String) } });
    expect((await taskService.get(r.value.id))?.endDate).toBe('2026-05-05');
  });
  it('positions strictement croissantes dans une colonne', async () => {
    for (let i = 0; i < 4; i++) await taskService.create({ ...tin, title: `t${i}` });
    const ps = (await taskService.list()).map((t) => t.position);
    expect(new Set(ps).size).toBe(4);
  });
  it('move vers la meme colonne : statut inchange', async () => {
    const r = await taskService.create(tin);
    if (!r.ok) throw new Error();
    await taskService.move(r.value.id, 'draft');
    expect((await taskService.get(r.value.id))?.status).toBe('draft');
  });
  it('move id inconnu : sans effet, sans exception', async () => {
    await expect(taskService.move('nope', 'done')).resolves.toBeUndefined();
  });
  it('commentaire sur tache inconnue refuse ; toggleStar x2 = identite', async () => {
    expect((await taskService.addComment('nope', 'x')).ok).toBe(false);
    const r = await taskService.create(tin);
    if (!r.ok) throw new Error();
    await taskService.toggleStar(r.value.id);
    expect((await taskService.get(r.value.id))?.starred).toBe(true);
    await taskService.toggleStar(r.value.id);
    expect((await taskService.get(r.value.id))?.starred).toBe(false);
  });
  it('remove : supprime commentaires et sous-taches ; rappel non lie', async () => {
    const t = await taskService.create(tin);
    if (!t.ok) throw new Error();
    await taskService.addComment(t.value.id, 'c');
    await taskService.addSubtask(t.value.id, 's');
    const r = await rs.create({ ...rin, taskId: t.value.id });
    if (!r.ok) throw new Error();
    await taskService.remove(t.value.id);
    expect(await db.comments.count()).toBe(0);
    expect(await db.subtasks.count()).toBe(0);
    expect((await rs.get(r.value.id))?.taskId).toBeUndefined();
    expect(await taskService.remindersOf(t.value.id)).toEqual([]);
  });
});

describe('QA service rappels', () => {
  // BUG-01 : voir docs/QA-REPORT.md
  it("recurrent : changer l'heure d'une serie dont le debut est passe (CA-R2.1)", async () => {
    const r = await rs.create({ ...rin, recurrence: 'daily', time: '09:00' });
    if (!r.ok) throw new Error();
    clock.now = at('2026-05-10', '12:00');
    const u = await rs.update(r.value.id, { ...rin, recurrence: 'daily', time: '18:00' });
    expect(u.ok).toBe(true);
  });
  it("recurrent : changer la recurrence d'une serie dont l'ancre est passee reste permis", async () => {
    const r = await rs.create({ ...rin, recurrence: 'daily' });
    if (!r.ok) throw new Error();
    clock.now = at('2026-05-10', '12:00');
    const u = await rs.update(r.value.id, { ...rin, recurrence: 'weekly' });
    expect(u).toMatchObject({ ok: true, value: { nextDueAt: at('2026-05-15', '09:00') } });
  });
  it('rappel declenche (non recurrent) : modifier le titre garde nextDueAt null', async () => {
    const r = await rs.create(rin);
    if (!r.ok) throw new Error();
    clock.now = at('2026-05-01', '09:00');
    await processDueReminders(clock.now);
    const u = await rs.update(r.value.id, { ...rin, title: 'Autre' });
    expect(u).toMatchObject({ ok: true, value: { nextDueAt: null } });
  });
  it('rappel declenche replanifie dans le futur : se redeclenche', async () => {
    const r = await rs.create(rin);
    if (!r.ok) throw new Error();
    clock.now = at('2026-05-01', '09:00');
    await processDueReminders(clock.now);
    const u = await rs.update(r.value.id, { ...rin, startDate: '2026-05-02' });
    expect(u).toMatchObject({ ok: true, value: { nextDueAt: at('2026-05-02', '09:00') } });
    expect((await processDueReminders(at('2026-05-02', '09:00'))).fired).toHaveLength(1);
  });
  it("modifier l'heure : l'ancienne echeance ne se declenche plus (CA-R2.3)", async () => {
    const r = await rs.create(rin);
    if (!r.ok) throw new Error();
    await rs.update(r.value.id, { ...rin, time: '11:00' });
    expect((await processDueReminders(at('2026-05-01', '09:00'))).fired).toHaveLength(0);
    expect((await processDueReminders(at('2026-05-01', '11:00'))).fired).toHaveLength(1);
  });
  it('supprime : ne se declenche plus (CA-R3.2)', async () => {
    const r = await rs.create(rin);
    if (!r.ok) throw new Error();
    await rs.remove(r.value.id);
    const res = await processDueReminders(at('2026-05-02', '09:00'));
    expect(res.fired.length + res.missed.length).toBe(0);
  });
  it('plusieurs rappels a la meme minute : un evenement chacun', async () => {
    for (const t of ['A', 'B', 'C']) await rs.create({ ...rin, title: t });
    const res = await processDueReminders(at('2026-05-01', '09:00'));
    expect(res.fired.map((f) => f.event.title).sort()).toEqual(['A', 'B', 'C']);
  });
  it('limite exacte 5 min : fired ; +1 ms : missed', async () => {
    await rs.create(rin);
    const dueAt = at('2026-05-01', '09:00');
    expect((await processDueReminders(dueAt + 300_000)).fired).toHaveLength(1);
    await db.reminders.clear();
    await db.reminderEvents.clear();
    await rs.create(rin);
    expect((await processDueReminders(dueAt + 300_001)).missed).toHaveLength(1);
  });
  it('hebdo manque 3 semaines : un seul manque, prochaine occurrence future', async () => {
    const r = await rs.create({ ...rin, recurrence: 'weekly' });
    if (!r.ok) throw new Error();
    const res = await processDueReminders(at('2026-05-23', '12:00'));
    expect(res.missed).toHaveLength(1);
    expect(res.missed[0].dueAt).toBe(at('2026-05-22', '09:00'));
    expect((await rs.get(r.value.id))?.nextDueAt).toBe(at('2026-05-29', '09:00'));
  });
  it('relancer processDueReminders ne double rien (CA-R5.4)', async () => {
    await rs.create(rin);
    const now = at('2026-05-01', '09:00');
    await processDueReminders(now);
    const again = await processDueReminders(now);
    expect(again.fired).toHaveLength(0);
    expect(await db.reminderEvents.count()).toBe(1);
  });
});

describe('QA creneaux', () => {
  const s = { date: '2026-05-01', start: '09:00', end: '10:00', title: 'S' };
  it('traversant minuit refuse', async () => {
    expect((await planSlotService.create({ ...s, start: '23:00', end: '01:00' })).ok).toBe(false);
  });
  it('conserves par jour, tries par debut', async () => {
    await planSlotService.create({ ...s, start: '14:00', end: '15:00' });
    await planSlotService.create(s);
    await planSlotService.create({ ...s, date: '2026-05-02' });
    expect((await planSlotService.listByDate('2026-05-01')).map((x) => x.start)).toEqual(['09:00', '14:00']);
    expect(await planSlotService.listByDate('2026-05-03')).toEqual([]);
  });
  it('titre espaces refuse', async () => {
    expect((await planSlotService.create({ ...s, title: '  ' })).ok).toBe(false);
  });
});

describe('QA stats', () => {
  const mkTask = (o: Partial<Task>): Task => ({
    id: Math.random().toString(), title: 't', status: 'draft', progress: 0, starred: false,
    startDate: '2026-05-01', endDate: '2026-05-02', position: 1, createdAt: 0, updatedAt: 0, ...o,
  });
  it('rings : progress hors bornes borne, limite non entiere', () => {
    const r = computeRings([mkTask({ progress: 150 }), mkTask({ progress: -5 })], 2.9);
    expect(r.map((x) => x.percent).sort((a, b) => a - b)).toEqual([0, 100]);
  });
  it('histogramme : terminee puis rouverte ne compte plus (CA-D2.2)', async () => {
    const r = await taskService.create(tin);
    if (!r.ok) throw new Error();
    await taskService.update(r.value.id, { status: 'done' });
    const today = fromEpochMs(Date.now()).date;
    const sum = async () => completedPerDay(await taskService.list(), 7, today).reduce((a, b) => a + b.count, 0);
    expect(await sum()).toBe(1);
    await taskService.update(r.value.id, { status: 'editing' });
    expect(await sum()).toBe(0);
  });
});

describe('QA sauvegarde / reglages', () => {
  it('import refuse les fichiers invalides ; donnees intactes', async () => {
    await taskService.create(tin);
    const good = JSON.parse(await exportBackupJson());
    const bad = [
      '{nope',
      JSON.stringify({ app: 'x', version: 1, data: {} }),
      JSON.stringify({ ...good, version: 99 }),
      JSON.stringify({ ...good, data: { ...good.data, tasks: undefined } }),
      JSON.stringify({ ...good, data: { ...good.data, tasks: [{ title: 'sans id' }] } }),
      'null',
    ];
    for (const b of bad) expect((await importBackupJson(b)).ok).toBe(false);
    expect(await db.tasks.count()).toBe(1);
  });
  it("import avec doublon d'id : echec atomique", async () => {
    await taskService.create(tin);
    const good = JSON.parse(await exportBackupJson());
    good.data.tasks = [good.data.tasks[0], good.data.tasks[0]];
    expect((await importBackupJson(JSON.stringify(good))).ok).toBe(false);
    expect(await db.tasks.count()).toBe(1);
  });
  it('profil : nom vide refuse, defaut conserve', async () => {
    expect((await settingsService.setProfile({ displayName: '  ' })).ok).toBe(false);
    expect((await settingsService.getProfile()).displayName).toBe('Moi');
  });
});
