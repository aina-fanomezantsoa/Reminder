'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';

export interface DrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Tiroir latéral droit basé sur <dialog> (focus piégé, Échap). Plein écran sous 640 px. */
export function Drawer({ open, title, onClose, children }: DrawerProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
    return () => {
      if (d.open) d.close();
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-0 ml-auto h-dvh max-h-none w-full max-w-none bg-canvas p-0 text-body shadow-card-lg sm:w-96 sm:rounded-l-[20px]"
    >
      {open && (
        <div className="flex h-dvh flex-col">
          <div className="flex items-center justify-between gap-4 px-5 pb-2 pt-4">
            <h2 id={titleId} className="font-display text-xl font-semibold text-ink">
              {title}
            </h2>
            <IconButton label="Fermer" icon={<X className="size-5" />} onClick={onClose} />
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-8 pt-2">{children}</div>
        </div>
      )}
    </dialog>
  );
}
