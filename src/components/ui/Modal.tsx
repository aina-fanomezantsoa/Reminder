'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { IconButton } from './IconButton';

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  size?: 'md' | 'lg';
  children: ReactNode;
  footer?: ReactNode;
  role?: 'dialog' | 'alertdialog';
  describedBy?: string;
}

/**
 * Modale basée sur <dialog> natif : piège de focus, Échap, retour du focus au déclencheur.
 * L'élément portant `data-autofocus` reçoit le focus initial.
 * En dessous de 640 px : feuille plein écran.
 */
export function Modal({ open, title, onClose, size = 'md', children, footer, role = 'dialog', describedBy }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      d.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    } else if (!open && d.open) {
      d.close();
    }
    return () => {
      if (d.open) d.close();
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      role={role}
      aria-labelledby={titleId}
      aria-describedby={describedBy}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        'm-auto w-[calc(100%-2rem)] overflow-hidden rounded-[20px] bg-surface p-0 text-body shadow-card-lg',
        size === 'md' ? 'max-w-lg' : 'max-w-xl',
        'max-sm:m-0 max-sm:h-dvh max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:rounded-none',
      )}
    >
      {open && (
        <div className="flex max-h-[90dvh] flex-col max-sm:h-dvh max-sm:max-h-none">
          <div className="flex items-center justify-between gap-4 px-6 pb-2 pt-5">
            <h2 id={titleId} className="font-display text-xl font-semibold text-ink">
              {title}
            </h2>
            <IconButton label="Fermer" icon={<X className="size-5" />} onClick={onClose} />
          </div>
          <div className="flex-1 overflow-y-auto px-6 pb-4">{children}</div>
          {footer && <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line bg-surface px-6 py-4">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
