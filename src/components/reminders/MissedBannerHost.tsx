'use client';

import { useMemo } from 'react';
import { useReminders } from '@/data/hooks';
import { reminderService } from '@/data/services/reminders';
import { fromEpochMs } from '@/domain/dates';
import { shortDate } from '@/lib/format';
import type { ID } from '@/domain/types';
import { useToast } from '@/components/ui/Toast';
import { MissedBanner } from './MissedBanner';

/** Branche `MissedBanner` sur les données : affiché au-dessus du contenu de toutes les pages. */
export function MissedBannerHost() {
  const lists = useReminders();
  const toast = useToast();

  const nextByReminder = useMemo(() => {
    const map: Record<ID, string> = {};
    for (const r of lists?.upcoming ?? []) {
      if (r.recurrence !== 'none' && r.nextDueAt !== null) map[r.id] = shortDate(fromEpochMs(r.nextDueAt).date);
    }
    return map;
  }, [lists]);

  if (!lists || lists.missed.length === 0) return null;

  const ack = async (ids: string[]) => {
    try {
      await Promise.all(ids.map((id) => reminderService.acknowledgeMissed(id)));
    } catch {
      toast.push({ tone: 'error', message: 'Impossible de fermer le bandeau. Réessayez.' });
    }
  };

  return (
    <MissedBanner
      missed={lists.missed}
      nextByReminder={nextByReminder}
      onAcknowledge={(id) => void ack([id])}
      onAcknowledgeAll={() => void ack(lists.missed.map((e) => e.id))}
    />
  );
}
