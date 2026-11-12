import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/data/db';
import { taskService } from '@/data/services/tasks';
import { createReminderService } from '@/data/services/reminders';
import { settingsService } from '@/data/services/settings';
import { backupFileName, exportBackupJson, importBackupJson } from '@/data/services/backup';
import {
  buildTaskCards,
  calendarGridRange,
  groupBoard,
  loadCalendarEntries,
  loadReminderLists,
  loadTaskBoard,
} from '@/data/queries';
import { LATE_GRACE_MS, SAFETY_TICK_MS, nextDelay, processDueReminders } from '@/notifications/scheduler';
import { toEpochMs } from '@/domain/dates';
import type { ReminderInput } from '@/domain/types';

// TZ Europe/Paris (vitest.config). Horloge simulée : `clock.now` pilote les services.
const clock = { now: toEpochMs('2026-05-01', '08:00') };
const svc = createReminderService(() => clock.now);
const at = (d: string, t: string) => toEpochMs(d, t);

const base: ReminderInput = { title: 'Appeler', startDate: '2026-05-01', time: '09:00', recurrence: 'none' };
async function mk(o: Partial<ReminderInput> = {}) {
  const r = await svc.create({ ...base, ...o });
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.value;
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
  clock.now = at('2026-05-01', '08:00');
});

describe('service rappels', () => {
  it('create : nextDueAt calculé, note vide ignorée, validation sans exception', async () => {
    const r = await mk({ note: '  ' });
    expect(r.nextDueAt).toBe(at('2026-05-01', '09:00'));
    expect(r.note).toBeUndefined();
    expect(await svc.create({ ...base, title: '   ' })).toMatchObject({ ok: false, errors: { title: expect.any(String) } });
    expect(await db.reminders.count()).toBe(1);
  });
  it('refuse une date/heure passée (et l\'instant présent)', async () => {
    expect(await svc.create({ ...base, startDate: '2026-04-30' })).toMatchObject({ ok: false, errors: { startDate: expect.any(String) } });
    expect(await svc.create({ ...base, time: '08:00' })).toMatchObject({ ok: false, errors: { startDate: expect.any(String) } });
    expect((await svc.create({ ...base, time: '08:01' })).ok).toBe(true);
  });
  it('tâche liée inexistante refusée ; tâche existante acceptée', async () => {
    expect(await svc.create({ ...base, taskId: 'nope' })).toMatchObject({ ok: false, errors: { taskId: expect.any(String) } });
    const t = await taskService.create({ title: 'T', startDate: '2026-05-01', endDate: '2026-05-02' });
    if (!t.ok) throw new Error();
    expect((await mk({ taskId: t.value.id })).taskId).toBe(t.value.id);
  });
  it('update : changer l\'heure déplace nextDueAt (CA-R2.3) ; titre seul garde l\'échéance', async () => {
    const r = await mk();
    const u = await svc.update(r.id, { ...base, time: '10:30' });
    expect(u).toMatchObject({ ok: true, value: { nextDueAt: at('2026-05-01', '10:30') } });
    const u2 = await svc.update(r.id, { ...base, time: '10:30', title: 'Autre' });
    expect(u2).toMatchObject({ ok: true, value: { title: 'Autre', nextDueAt: at('2026-05-01', '10:30'), createdAt: r.createdAt } });
    expect(await svc.update(r.id, { ...base, startDate: '2026-04-01' })).toMatchObject({ ok: false });
    expect((await svc.update('nope', base)).ok).toBe(false);
  });
  it('update d\'une série dont l\'ancre est passée : titre modifiable sans refus', async () => {
    const r = await mk({ recurrence: 'daily' });
    clock.now = at('2026-05-10', '12:00');
    await processDueReminders(clock.now);
    const u = await svc.update(r.id, { ...base, recurrence: 'daily', title: 'Renommé' });
    expect(u).toMatchObject({ ok: true, value: { title: 'Renommé' } });
  });
  it('remove : série supprimée, journal conservé avec titre', async () => {
    const r = await mk();
    clock.now = at('2026-05-01', '09:00');
    await processDueReminders(clock.now);
    await svc.remove(r.id);
    expect(await db.reminders.count()).toBe(0);
    expect((await db.reminderEvents.toArray())[0].title).toBe('Appeler');
  });
  it('occurrencesBetween : récurrences futures dans la plage, triées', async () => {
    await mk({ title: 'Quotidien', recurrence: 'daily' });
    await mk({ title: 'Unique', startDate: '2026-05-03', time: '07:00' });
    const occ = await svc.occurrencesBetween('2026-05-02', '2026-05-04');
    expect(occ.map((o) => o.title)).toEqual(['Quotidien', 'Unique', 'Quotidien', 'Quotidien']);
    expect(occ.find((o) => o.title === 'Unique')?.recurring).toBe(false);
    expect(occ).toHaveLength(4);
    expect(occ.map((o) => o.at)).toEqual([...occ.map((o) => o.at)].sort((a, b) => a - b));
  });
});

describe('scheduler : processDueReminders (horloge simulée)', () => {
  it('avant l\'échéance : rien', async () => {
    await mk();
    expect(await processDueReminders(at('2026-05-01', '08:59'))).toEqual({ fired: [], missed: [] });
  });
  it('à l\'heure : fired une seule fois (anti-doublon), non récurrent => nextDueAt null', async () => {
    const r = await mk({ note: 'n' });
    const res = await processDueReminders(at('2026-05-01', '09:00'));
    expect(res.fired).toHaveLength(1);
    expect(res.fired[0]).toMatchObject({ note: 'n', event: { id: `${r.id}:${at('2026-05-01', '09:00')}`, title: 'Appeler', status: 'fired' } });
    expect((await db.reminders.get(r.id))?.nextDueAt).toBeNull();
    expect((await processDueReminders(at('2026-05-01', '09:00'))).fired).toHaveLength(0);
    expect(await db.reminderEvents.count()).toBe(1);
  });
  it('deux traitements concurrents : un seul événement', async () => {
    await mk();
    const [a, b] = await Promise.all([processDueReminders(at('2026-05-01', '09:00')), processDueReminders(at('2026-05-01', '09:00'))]);
    expect(a.fired.length + b.fired.length).toBe(1);
    expect(await db.reminderEvents.count()).toBe(1);
  });
  it('retard <= LATE_GRACE_MS : notification normale ; au-delà : manqué', async () => {
    await mk();
    const due = at('2026-05-01', '09:00');
    expect((await processDueReminders(due + LATE_GRACE_MS)).fired).toHaveLength(1);
    await mk({ title: 'B' });
    const res = await processDueReminders(due + LATE_GRACE_MS + 1);
    expect(res.fired).toHaveLength(0);
    expect(res.missed).toMatchObject([{ title: 'B', status: 'missed', acknowledged: false }]);
  });
  it('récurrent : seule l\'occurrence la plus récente est journalisée, nextDueAt saute au futur', async () => {
    const r = await mk({ recurrence: 'daily' });
    const now = at('2026-05-05', '12:00'); // 09:00 du 5 mai manquée, 2-4 mai ignorées
    const res = await processDueReminders(now);
    expect(res.missed).toHaveLength(1);
    expect(res.missed[0].dueAt).toBe(at('2026-05-05', '09:00'));
    expect((await db.reminders.get(r.id))?.nextDueAt).toBe(at('2026-05-06', '09:00'));
    expect(await db.reminderEvents.count()).toBe(1);
  });
  it('récurrent en retard léger : fired puis prochaine occurrence', async () => {
    const r = await mk({ recurrence: 'weekly' });
    const res = await processDueReminders(at('2026-05-08', '09:02'));
    expect(res.fired).toHaveLength(1);
    expect((await db.reminders.get(r.id))?.nextDueAt).toBe(at('2026-05-15', '09:00'));
  });
  it('mensuel du 31 : fired fin février (clamp)', async () => {
    clock.now = at('2026-01-01', '08:00');
    const r = await mk({ startDate: '2026-01-31', recurrence: 'monthly' });
    await processDueReminders(at('2026-01-31', '09:00'));
    expect((await db.reminders.get(r.id))?.nextDueAt).toBe(at('2026-02-28', '09:00'));
  });
  it('rappel supprimé avant l\'échéance : rien', async () => {
    const r = await mk();
    await svc.remove(r.id);
    expect((await processDueReminders(at('2026-05-01', '09:00'))).fired).toHaveLength(0);
  });
  it('nextDelay : plafonné au contrôle de sécurité, jamais négatif', () => {
    expect(nextDelay(null, 1000)).toBe(SAFETY_TICK_MS);
    expect(nextDelay(1000 + 5000, 1000)).toBe(5000);
    expect(nextDelay(1000 + 10 * 60_000, 1000)).toBe(SAFETY_TICK_MS);
    expect(nextDelay(500, 1000)).toBe(0);
  });
});

describe('manqués et listes', () => {
  it('acknowledgeMissed retire le rappel manqué de la liste', async () => {
    await mk();
    await processDueReminders(at('2026-05-01', '12:00'));
    let lists = await loadReminderLists();
    expect(lists.missed).toHaveLength(1);
    expect(lists.upcoming).toHaveLength(0);
    expect(lists.past).toHaveLength(1);
    await svc.acknowledgeMissed(lists.missed[0].id);
    lists = await loadReminderLists();
    expect(lists.missed).toHaveLength(0);
  });
  it('upcoming trié par échéance croissante', async () => {
    await mk({ title: 'B', time: '12:00' });
    await mk({ title: 'A', time: '09:00' });
    expect((await loadReminderLists()).upcoming.map((r) => r.title)).toEqual(['A', 'B']);
  });
});

describe('builder cartes / board / calendrier', () => {
  it('buildTaskCards : sous-tâches triées, compteurs', () => {
    const t = { id: 'a', title: 'a', status: 'draft', progress: 0, starred: false, startDate: '2026-05-01', endDate: '2026-05-02', position: 1, createdAt: 1, updatedAt: 1 } as const;
    const subs = [
      { id: 's2', taskId: 'a', title: '2', done: false, position: 2 },
      { id: 's1', taskId: 'a', title: '1', done: true, position: 1 },
    ];
    const [c] = buildTaskCards([t], subs, [{ taskId: 'a' }, { taskId: 'a' }, { taskId: 'z' }]);
    expect(c.subtasks.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(c.commentCount).toBe(2);
    expect(c.attachmentCount).toBe(0);
    const board = groupBoard([c]);
    expect(Object.keys(board)).toEqual(['draft', 'in_progress', 'editing', 'done']);
    expect(board.draft).toHaveLength(1);
  });
  it('loadTaskBoard : 4 colonnes triées par position, vide OK', async () => {
    expect(Object.values(await loadTaskBoard()).every((c) => c.length === 0)).toBe(true);
    const a = await taskService.create({ title: 'A', startDate: '2026-05-01', endDate: '2026-05-02' });
    const b = await taskService.create({ title: 'B', startDate: '2026-05-01', endDate: '2026-05-02' });
    if (!a.ok || !b.ok) throw new Error();
    await taskService.addSubtask(a.value.id, 's');
    await taskService.addComment(a.value.id, 'c');
    await taskService.move(b.value.id, 'draft', a.value.id);
    const board = await loadTaskBoard();
    expect(board.draft.map((t) => t.title)).toEqual(['B', 'A']);
    expect(board.draft[1]).toMatchObject({ commentCount: 1, attachmentCount: 0 });
    expect(board.draft[1].subtasks).toHaveLength(1);
  });
  it('calendarGridRange : 6 semaines lundi-dimanche', () => {
    expect(calendarGridRange('2026-05-17')).toEqual({ from: '2026-04-27', to: '2026-06-07' });
  });
  it('loadCalendarEntries : tâches chevauchant la grille + occurrences de rappels', async () => {
    await taskService.create({ title: 'Dedans', startDate: '2026-05-10', endDate: '2026-05-12' });
    await taskService.create({ title: 'Chevauche', startDate: '2026-04-20', endDate: '2026-04-28' });
    await taskService.create({ title: 'Hors', startDate: '2026-07-01', endDate: '2026-07-02' });
    await mk({ recurrence: 'weekly' });
    const e = await loadCalendarEntries('2026-05-01');
    expect(e.tasks.map((t) => t.title)).toEqual(['Chevauche', 'Dedans']);
    expect(e.reminders).toHaveLength(6); // 1, 8, 15, 22, 29 mai, 5 juin
  });
});

describe('settings', () => {
  it('profil : défaut, validation, persistance', async () => {
    expect((await settingsService.getProfile()).displayName).toBeTruthy();
    expect(await settingsService.setProfile({ displayName: '  ' })).toMatchObject({ ok: false, errors: { displayName: expect.any(String) } });
    expect(await settingsService.setProfile({ displayName: ' Aina ' })).toMatchObject({ ok: true, value: { displayName: 'Aina' } });
    expect(await settingsService.getProfile()).toEqual({ displayName: 'Aina' });
  });
  it('invite de notification : pending par défaut', async () => {
    expect(await settingsService.getNotificationPromptState()).toBe('pending');
    await settingsService.setNotificationPromptState('answered');
    expect(await settingsService.getNotificationPromptState()).toBe('answered');
  });
});

describe('backup JSON', () => {
  it('aller-retour exact ; import invalide ne modifie rien', async () => {
    await mk();
    const t = await taskService.create({ title: 'T', startDate: '2026-05-01', endDate: '2026-05-02' });
    if (!t.ok) throw new Error();
    await taskService.addSubtask(t.value.id, 's');
    await settingsService.setProfile({ displayName: 'X' });
    const json = await exportBackupJson(1);
    await Promise.all(db.tables.map((x) => x.clear()));
    const res = await importBackupJson(json);
    expect(res).toMatchObject({ ok: true, counts: { reminders: 1, tasks: 1, subtasks: 1, settings: 1 } });
    expect(await exportBackupJson(1)).toBe(json);
    for (const bad of ['{', '{}', JSON.stringify({ app: 'reminder', version: 1, data: { reminders: [] } }), JSON.stringify({ app: 'reminder', version: 99, data: {} })]) {
      expect((await importBackupJson(bad)).ok).toBe(false);
    }
    expect(await db.tasks.count()).toBe(1);
    expect(backupFileName(at('2026-05-01', '09:00'))).toBe('reminder-2026-05-01.json');
  });
});
