'use client';

import Link from 'next/link';
import { cn } from '@/lib/cn';
import { ACCENT_HEX, taskAccent } from '@/lib/accent';
import type { ID, RingMetric } from '@/domain/types';

export interface EfficiencyRingsProps {
  rings: RingMetric[];
  size: 'sm' | 'lg';
  limit: number;
  totalTasks?: number;
  onSelect: (taskId: ID) => void;
  onCreate?: () => void;
}

const DIMS = { sm: { box: 48, stroke: 6 }, lg: { box: 96, stroke: 10 } };

export function EfficiencyRings({ rings, size, limit, totalTasks, onSelect, onCreate }: EfficiencyRingsProps) {
  const shown = rings.slice(0, limit);

  if (shown.length === 0) {
    return (
      <div className="flex flex-col items-start gap-1 text-sm text-muted">
        <p>Pas encore de tâche à suivre.</p>
        {onCreate && (
          <button type="button" onClick={onCreate} className="rounded font-medium text-brand underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            Créer une tâche
          </button>
        )}
      </div>
    );
  }

  const { box, stroke } = DIMS[size];
  const r = (box - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div>
      <ul role="list" className={cn(size === 'sm' ? 'flex flex-wrap gap-3' : 'grid grid-cols-2 gap-6 sm:grid-cols-4')}>
        {shown.map((ring) => {
          const accent = ACCENT_HEX[taskAccent(ring.taskId)];
          const label = `${ring.label}, ${ring.percent} % de progression`;
          return (
            <li key={ring.taskId} className={cn(size === 'lg' && 'flex justify-center')}>
              <button
                type="button"
                aria-label={label}
                title={label}
                onClick={() => onSelect(ring.taskId)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl p-1 transition duration-150 hover:bg-white/70 motion-reduce:transition-none',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
                  size === 'lg' && 'w-full max-w-[8.5rem]',
                )}
              >
                <span className="relative inline-flex" style={{ width: box, height: box }}>
                  <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} aria-hidden className="-rotate-90">
                    <circle cx={box / 2} cy={box / 2} r={r} fill="none" stroke={accent.soft} strokeWidth={stroke} />
                    <circle
                      cx={box / 2}
                      cy={box / 2}
                      r={r}
                      fill="none"
                      stroke={accent.strong}
                      strokeWidth={stroke}
                      strokeLinecap="round"
                      strokeDasharray={c}
                      strokeDashoffset={c * (1 - ring.percent / 100)}
                    />
                  </svg>
                  <span
                    aria-hidden
                    className={cn('absolute inset-0 flex items-center justify-center font-display font-semibold tabular-nums text-ink', size === 'sm' ? 'text-xs' : 'text-xl')}
                  >
                    {ring.percent}
                    {size === 'lg' && <span className="text-sm">%</span>}
                  </span>
                </span>
                <span aria-hidden className={cn('text-ink', size === 'sm' ? 'font-display text-xs font-semibold' : 'line-clamp-2 text-center text-xs font-medium')}>
                  {size === 'sm' ? (ring.label.trim()[0] ?? '?').toLocaleUpperCase('fr') : ring.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {totalTasks !== undefined && totalTasks > shown.length && (
        <Link href="/tasks" className="mt-4 inline-block rounded text-sm font-medium text-brand underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
          Voir toutes les tâches ({totalTasks})
        </Link>
      )}
    </div>
  );
}
