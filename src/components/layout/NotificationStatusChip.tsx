import Link from 'next/link';
import { cn } from '@/lib/cn';
import type { PermissionState } from '@/domain/types';

/** Indicateur d'en-tête discret : point de statut + texte (jamais la couleur seule). Mène à /reminders. */
export function NotificationStatusChip({ permission }: { permission: PermissionState }) {
  const active = permission === 'granted';
  return (
    <Link
      href="/reminders"
      className={cn(
        'inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs font-medium text-muted transition-colors duration-150 hover:bg-brand-soft hover:text-ink motion-reduce:transition-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
      )}
    >
      <span aria-hidden className={cn('size-2 rounded-full', active ? 'bg-st-done' : 'bg-amber-500')} />
      {active ? 'Notifications actives' : 'Notifications désactivées'}
    </Link>
  );
}
