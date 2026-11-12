'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ToastTone = 'success' | 'error' | 'info';
export interface ToastInput {
  tone?: ToastTone;
  message: string;
  action?: { label: string; onClick: () => void };
  /** Durée en ms (5000 par défaut) ; 0 = persistant. */
  duration?: number;
}
interface ToastItem extends ToastInput {
  id: number;
  tone: ToastTone;
}

const ToastContext = createContext<{ push: (t: ToastInput) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast doit être utilisé dans <ToastProvider>.');
  return ctx;
}

const TONES: Record<ToastTone, { box: string; Icon: typeof Info }> = {
  success: { box: 'bg-green-50 text-st-done-ink', Icon: CheckCircle2 },
  error: { box: 'bg-red-50 text-red-800', Icon: AlertTriangle },
  info: { box: 'bg-brand-soft text-body', Icon: Info },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const host = useRef<HTMLDivElement>(null);

  // Le conteneur est dans la couche supérieure (popover) pour rester visible au-dessus des modales ouvertes ;
  // à chaque nouveau toast on le ré-affiche pour le replacer au premier plan.
  useEffect(() => {
    const el = host.current;
    if (!el || typeof el.showPopover !== 'function') return;
    try {
      if (items.length === 0) {
        if (el.matches(':popover-open')) el.hidePopover();
        return;
      }
      if (el.matches(':popover-open')) el.hidePopover();
      el.showPopover();
    } catch {
      // navigateur sans prise en charge : le conteneur reste en position fixe classique
    }
  }, [items]);

  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const push = useCallback((t: ToastInput) => {
    const id = ++seq.current;
    setItems((l) => [...l, { ...t, id, tone: t.tone ?? 'success' }]);
  }, []);
  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        ref={host}
        popover="manual"
        className="pointer-events-none fixed inset-auto bottom-20 right-4 z-[100] m-0 overflow-visible border-0 bg-transparent p-0 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3 md:bottom-6 md:right-6"
      >
        {items.map((t) => (
          <ToastView key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const timer = useRef<number | null>(null);
  const duration = item.duration ?? 5000;
  const start = useCallback(() => {
    if (duration > 0) timer.current = window.setTimeout(onDismiss, duration);
  }, [duration, onDismiss]);
  const stop = useCallback(() => {
    if (timer.current != null) window.clearTimeout(timer.current);
  }, []);
  const { box, Icon } = TONES[item.tone];

  return (
    <div
      ref={(el) => {
        // démarre le minuteur au montage, l'arrête au démontage
        if (el) start();
        else stop();
      }}
      role={item.tone === 'error' ? 'alert' : 'status'}
      onMouseEnter={stop}
      onMouseLeave={start}
      onFocus={stop}
      onBlur={start}
      className={cn('pointer-events-auto flex items-start gap-3 rounded-xl p-4 text-sm font-medium shadow-card-lg', box)}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <p className="flex-1">{item.message}</p>
      {item.action && (
        <button
          type="button"
          onClick={() => {
            item.action?.onClick();
            onDismiss();
          }}
          className="rounded-md px-2 font-medium underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          {item.action.label}
        </button>
      )}
      <button
        type="button"
        aria-label="Fermer la notification"
        onClick={onDismiss}
        className="rounded-md p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
