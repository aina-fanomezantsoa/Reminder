import { timeToMinutes } from './dates';
import type { ID, PlanSlot, SlotInput } from './types';

/** Deux créneaux du même jour se chevauchent si leurs intervalles s'intersectent (bornes jointives = pas de chevauchement). */
export function slotsOverlap(a: Pick<PlanSlot, 'date' | 'start' | 'end'>, b: Pick<PlanSlot, 'date' | 'start' | 'end'>): boolean {
  if (a.date !== b.date) return false;
  return timeToMinutes(a.start) < timeToMinutes(b.end) && timeToMinutes(b.start) < timeToMinutes(a.end);
}

/** Créneaux existants en conflit avec `candidate` (en ignorant `ignoreId`, utile à la modification). */
export function findOverlaps(existing: PlanSlot[], candidate: SlotInput, ignoreId?: ID): PlanSlot[] {
  return existing.filter((s) => s.id !== ignoreId && slotsOverlap(s, candidate));
}
