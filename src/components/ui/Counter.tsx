import { MessageSquare, Paperclip } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface CounterProps {
  icon: 'comment' | 'attachment';
  count: number;
}

/** Compteur : `0` toujours affiché, en gris atténué (CA-T6.2). */
export function Counter({ icon, count }: CounterProps) {
  const Icon = icon === 'comment' ? MessageSquare : Paperclip;
  const noun = icon === 'comment' ? 'commentaire' : 'pièce jointe';
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium', count === 0 ? 'text-subtle' : 'text-body')}>
      <Icon className="size-4" aria-hidden />
      <span aria-hidden className="tabular-nums">
        {count}
      </span>
      <span className="sr-only">
        {count} {noun}
        {count > 1 ? 's' : ''}
      </span>
    </span>
  );
}
