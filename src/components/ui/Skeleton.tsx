import { cn } from '@/lib/cn';

const SHAPES = {
  card: 'h-44 rounded-2xl',
  row: 'h-14 rounded-xl',
  ring: 'size-12 rounded-full',
  bar: 'h-14 rounded-xl',
};

export function Skeleton({ variant = 'card', className }: { variant?: keyof typeof SHAPES; className?: string }) {
  return <div aria-hidden className={cn('bg-line/60', SHAPES[variant], className)} />;
}
