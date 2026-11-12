'use client';

import { useRef, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Classe de la pastille colorée (ex. `bg-st-draft`). */
  dot?: string;
}

export interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/** Groupe radio stylé (flèches pour changer d'option). */
export function Segmented<T extends string>({ options, value, onChange, ariaLabel, disabled, className, id }: SegmentedProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (index + dir + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div id={id} role="radiogroup" aria-label={ariaLabel} className={cn('inline-flex flex-wrap gap-1 rounded-xl bg-stage p-1', className)}>
      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'inline-flex min-h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium transition duration-150 motion-reduce:transition-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
              active ? 'bg-surface text-ink shadow-pill ring-1 ring-line' : 'text-muted hover:text-ink',
              'disabled:opacity-60',
            )}
          >
            {o.dot && <span aria-hidden className={cn('size-2.5 rounded-full', o.dot)} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
