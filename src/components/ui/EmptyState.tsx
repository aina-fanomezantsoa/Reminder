import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  tone?: 'default' | 'subtle';
  className?: string;
}

export function EmptyState({ icon, title, description, action, tone = 'default', className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl px-6 py-10 text-center',
        tone === 'default' ? 'bg-surface shadow-card' : 'border-2 border-dashed border-line',
        className,
      )}
    >
      <span aria-hidden className="flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand">
        {icon}
      </span>
      <p className="font-display text-base font-semibold text-ink">{title}</p>
      {description && <p className="max-w-sm text-sm text-body">{description}</p>}
      {action && <Button onClick={action.onClick}>{action.label}</Button>}
    </div>
  );
}
