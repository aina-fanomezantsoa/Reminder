import { cn } from '@/lib/cn';
import { ACCENT_CLASSES, type AccentName } from '@/lib/accent';

export interface AvatarProps {
  label: string;
  accent: AccentName;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = { sm: 'size-7 text-xs', md: 'size-9 text-sm', lg: 'size-12 text-lg' };

/** Pastille avec l'initiale du titre. Décorative (`aria-hidden`) : le titre est lu à côté. */
export function Avatar({ label, accent, size = 'md', className }: AvatarProps) {
  const a = ACCENT_CLASSES[accent];
  const initial = (label.trim()[0] ?? '?').toLocaleUpperCase('fr');
  return (
    <span
      aria-hidden
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold', a.strong, a.onStrong, SIZES[size], className)}
    >
      {initial}
    </span>
  );
}
