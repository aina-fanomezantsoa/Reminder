import { db, newId } from '../db';
import { slotInputSchema, validate } from '@/domain/schemas';
import { findOverlaps } from '@/domain/slots';
import type { ID, LocalDate, PlanSlot, PlanSlotResult, PlanSlotService, SlotInput } from '@/domain/types';

const byStart = (a: PlanSlot, b: PlanSlot) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end);

export const planSlotService: PlanSlotService & { listByDate(date: LocalDate): Promise<PlanSlot[]> } = {
  async listByDate(date) {
    return (await db.planSlots.where('date').equals(date).toArray()).sort(byStart);
  },

  async create(input) {
    return save(null, input);
  },

  async update(id, input) {
    return save(id, input);
  },

  async remove(id) {
    await db.planSlots.delete(id);
  },
};

async function save(id: ID | null, input: SlotInput) {
  const v = validate(slotInputSchema, input);
  if (!v.ok) return v;
  return db.transaction('rw', db.planSlots, db.tasks, async () => {
    const d = v.value;
    if (d.taskId && !(await db.tasks.get(d.taskId))) {
      return { ok: false as const, errors: { taskId: 'Tâche introuvable.' } };
    }
    if (id && !(await db.planSlots.get(id))) {
      return { ok: false as const, errors: { title: 'Créneau introuvable.' } };
    }
    const sameDay = await db.planSlots.where('date').equals(d.date).toArray();
    const overlaps = findOverlaps(sameDay, d, id ?? undefined).length > 0;
    const slot: PlanSlot = { id: id ?? newId(), date: d.date, start: d.start, end: d.end, title: d.title };
    if (d.taskId) slot.taskId = d.taskId;
    await db.planSlots.put(slot);
    const value: PlanSlotResult = { ...slot, overlaps };
    return { ok: true as const, value };
  });
}
