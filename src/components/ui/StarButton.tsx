import { Star } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface StarButtonProps {
  active: boolean;
  onToggle: () => void;
  label?: string;
  showLabel?: boolean;
  className?: string;
}

export function StarButton({ active, onToggle, label = 'Favori', showLabel, className }: StarButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={showLabel ? undefined : label}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-2 text-sm font-medium transition duration-150 motion-reduce:transition-none',
        'hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
        showLabel ? 'text-ink' : 'min-w-11',
        className,
      )}
    >
      <Star className={cn('size-5', active ? 'fill-star text-star' : 'text-subtle')} aria-hidden />
      {showLabel && label}
    </button>
  );
}
