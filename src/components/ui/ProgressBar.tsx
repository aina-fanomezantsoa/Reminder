import { cn } from '@/lib/cn';
import { ACCENT_CLASSES, type AccentName } from '@/lib/accent';

export interface ProgressBarProps {
  value: number;
  accent?: 'brand' | 'done' | AccentName;
  showLabel?: boolean;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function ProgressBar({ value, accent = 'brand', showLabel, label = 'Progression', size = 'md', className }: ProgressBarProps) {
  const v = Math.min(100, Math.max(0, Math.round(value)));
  const fill = accent === 'brand' ? 'bg-brand' : accent === 'done' ? 'bg-st-done' : ACCENT_CLASSES[accent].strong;
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {showLabel && (
        <div className="flex items-baseline justify-between text-xs font-medium text-body">
          <span>{label}</span>
          <span className="font-display font-semibold tabular-nums text-ink">{v} %</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={v}
        aria-valuetext={`${v} %`}
        className={cn('w-full overflow-hidden rounded-full bg-line', size === 'sm' ? 'h-1.5' : 'h-2.5')}
      >
        <div className={cn('h-full rounded-full transition-[width] duration-200 motion-reduce:transition-none', fill)} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}
