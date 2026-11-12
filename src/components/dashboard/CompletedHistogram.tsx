'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { parseLocalDate } from '@/domain/dates';
import type { BarDatum, LocalDate } from '@/domain/types';

export interface CompletedHistogramProps {
  data: BarDatum[];
  size: 'sm' | 'lg';
  today: LocalDate;
}

const CFG = {
  sm: { slot: 40, bar: 20, chart: 140 },
  lg: { slot: 64, bar: 32, chart: 240 },
};
const LABEL_H = 44;
const TOP_PAD = 22;
const OCEAN = '#2563EB';
const OCEAN_SOFT = '#9DBDF5';
const GRAPE = '#7C3AED';

/** Histogramme SVG (DESIGN 6.2) : valeur au-dessus de chaque barre, aujourd'hui à droite, pas d'axe Y. */
export function CompletedHistogram({ data, size, today }: CompletedHistogramProps) {
  const [asTable, setAsTable] = useState(false);
  const { slot, bar, chart: fullChart } = CFG[size];
  const total = data.reduce((s, d) => s + d.count, 0);
  const chart = total === 0 ? Math.round(fullChart * 0.4) : fullChart;
  const max = Math.max(...data.map((d) => d.count), 3);
  const best = total > 0 ? Math.max(...data.map((d) => d.count)) : 0;
  const bestIndex = best > 0 ? data.findIndex((d) => d.count === best) : -1;
  const W = Math.max(data.length, 1) * slot;
  const H = TOP_PAD + chart + LABEL_H;
  const plotH = chart;

  const ariaLabel =
    `Tâches terminées sur ${data.length} jours : ` + data.map((d) => `${format(parseLocalDate(d.date), 'EEEE d', { locale: fr })} : ${d.count}`).join(', ');

  return (
    <div>
      {total === 0 && <p className="mb-2 text-sm text-muted">Aucune tâche terminée ces 7 derniers jours</p>}
      <div className="flex items-start justify-between gap-2">
        <span />
        <button
          type="button"
          aria-pressed={asTable}
          onClick={() => setAsTable((v) => !v)}
          className="rounded text-xs font-medium text-brand underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          {asTable ? 'Voir en graphique' : 'Voir en tableau'}
        </button>
      </div>

      {!asTable && (
        <svg role="img" aria-label={ariaLabel} viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full" style={{ maxHeight: H * (size === 'lg' ? 1.1 : 1.2) }}>
          {data.map((d, i) => {
            const cx = i * slot + slot / 2;
            const isToday = d.date === today;
            const zero = d.count === 0;
            const h = zero ? 4 : Math.max(bar, (d.count / max) * plotH);
            const y = TOP_PAD + plotH - h;
            const fill = zero ? '#CBD5E1' : isToday ? OCEAN : i === bestIndex ? GRAPE : OCEAN_SOFT;
            const dayNum = format(parseLocalDate(d.date), 'dd');
            return (
              <g key={d.date}>
                <rect x={cx - bar / 2} y={y} width={bar} height={h} rx={zero ? 2 : bar / 2} fill={fill} />
                <text x={cx} y={y - 6} textAnchor="middle" className="tabular-nums" fontSize="12" fontWeight="600" fill={zero ? '#57534e' : '#1c1917'}>
                  {d.count}
                </text>
                <text x={cx} y={TOP_PAD + plotH + 18} textAnchor="middle" fontSize="12" fontWeight={isToday ? 600 : 500} fill={isToday ? OCEAN : '#57534e'}>
                  {isToday ? 'Auj.' : d.label}
                </text>
                <text x={cx} y={TOP_PAD + plotH + 34} textAnchor="middle" fontSize="12" fontWeight={isToday ? 600 : 500} fill={isToday ? OCEAN : '#57534e'}>
                  {dayNum}
                </text>
              </g>
            );
          })}
        </svg>
      )}

      <table className={asTable ? 'mt-2 w-full text-sm' : 'sr-only'}>
        <caption className={asTable ? 'sr-only' : undefined}>Tâches terminées par jour</caption>
        <thead>
          <tr>
            <th scope="col" className="text-left font-medium text-ink">
              Jour
            </th>
            <th scope="col" className="text-right font-medium text-ink">
              Terminées
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <th scope="row" className="text-left font-medium text-body">
                {format(parseLocalDate(d.date), 'EEEE d MMMM', { locale: fr })}
              </th>
              <td className="text-right tabular-nums text-ink">{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
