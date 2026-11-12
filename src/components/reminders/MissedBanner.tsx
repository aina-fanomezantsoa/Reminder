'use client';

import Link from 'next/link';
import { Clock } from 'lucide-react';
import { fromEpochMs } from '@/domain/dates';
import { shortDate } from '@/lib/format';
import type { ID, ReminderEvent } from '@/domain/types';
import { Button } from '@/components/ui/Button';

export interface MissedBannerProps {
  /** Occurrences manquées non acquittées. */
  missed: ReminderEvent[];
  /** Pour chaque rappel encore récurrent : libellé de sa prochaine occurrence. */
  nextByReminder?: Record<ID, string>;
  onAcknowledge: (eventId: string) => void;
  onAcknowledgeAll: () => void;
}

const MAX_LINES = 3;

/** Bandeau « rappel manqué », affiché sur toutes les pages tant qu'il reste des manqués non acquittés. */
export function MissedBanner({ missed, nextByReminder = {}, onAcknowledge, onAcknowledgeAll }: MissedBannerProps) {
  if (missed.length === 0) return null;
  const shown = missed.slice(0, MAX_LINES);
  const rest = missed.length - shown.length;

  return (
    <section role="region" aria-labelledby="missed-title" className="mb-4 flex gap-4 rounded-2xl bg-amber-100 p-5 text-amber-900">
      <Clock className="mt-0.5 size-6 shrink-0" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="missed-title" className="font-display text-base font-semibold">
            Vous avez manqué {missed.length} rappel{missed.length > 1 ? 's' : ''}
          </h2>
          {missed.length > 1 && (
            <Button variant="secondary" size="sm" onClick={onAcknowledgeAll}>
              Tout fermer
            </Button>
          )}
        </div>
        <ul className="flex flex-col gap-2">
          {shown.map((e) => {
            const { date, time } = fromEpochMs(e.dueAt);
            const next = nextByReminder[e.reminderId];
            return (
              <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{e.title}</span> · prévu le {shortDate(date)} à {time}
                  {next && <span className="block text-xs">Récurrent, prochaine occurrence le {next}</span>}
                </span>
                <Button variant="secondary" size="sm" aria-label={`Fermer : ${e.title}`} onClick={() => onAcknowledge(e.id)}>
                  Fermer
                </Button>
              </li>
            );
          })}
        </ul>
        {rest > 0 && (
          <Link
            href="/reminders"
            className="self-start rounded text-sm font-medium underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            + {rest} autre{rest > 1 ? 's' : ''}
          </Link>
        )}
      </div>
    </section>
  );
}
