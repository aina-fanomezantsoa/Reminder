'use client';

import Link from 'next/link';
import { Bell, Plus, Repeat } from 'lucide-react';
import { useReminders } from '@/data/hooks';
import { fromEpochMs } from '@/domain/dates';
import { weekdayShortDate } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useReminderEditor } from './ReminderEditorProvider';

/** Carte « Prochains rappels » du tableau de bord : les 3 prochaines échéances. */
export function UpcomingReminders({ limit = 3 }: { limit?: number }) {
  const lists = useReminders();
  const editor = useReminderEditor();

  if (!lists) {
    return (
      <div aria-busy="true" className="flex flex-col gap-2">
        {Array.from({ length: limit }, (_, i) => (
          <Skeleton key={i} variant="row" />
        ))}
      </div>
    );
  }
  const next = lists.upcoming.slice(0, limit);

  return (
    <>
      {next.length === 0 ? (
        <div className="mb-3 flex flex-col items-start gap-3">
          <p className="text-sm text-body">Aucun rappel à venir.</p>
          <Button size="sm" leftIcon={<Plus className="size-4" aria-hidden />} onClick={() => editor.openCreate()}>
            Nouveau rappel
          </Button>
        </div>
      ) : (
        <ul className="mb-3 flex flex-col gap-2">
          {next.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => editor.openEdit(r.id)}
                className="flex w-full items-center gap-3 rounded-xl bg-stage/60 px-3 py-2 text-left hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <Bell className="size-4 shrink-0 text-brand" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{r.title}</span>
                  <span className="block text-xs text-muted">
                    {weekdayShortDate(fromEpochMs(r.nextDueAt ?? 0).date)} · {r.time}
                  </span>
                </span>
                {r.recurrence !== 'none' && <Repeat className="size-3.5 shrink-0 text-subtle" aria-label="Récurrent" />}
              </button>
            </li>
          ))}
        </ul>
      )}
      <Link
        href="/reminders"
        className="rounded text-sm font-medium text-brand underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        Tous les rappels
      </Link>
    </>
  );
}
