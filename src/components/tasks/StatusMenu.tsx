'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { STATUS_LABELS, STATUS_STYLES } from '@/lib/constants';
import { TASK_STATUSES, type TaskStatus } from '@/domain/types';

export interface StatusMenuProps {
  current: TaskStatus;
  onChange: (status: TaskStatus) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  triggerLabel?: string;
}

/** Menu ⋮ : Changer de statut (alternative non glisser-déposer, CA-K2.4), Modifier, Supprimer. */
export function StatusMenu({ current, onChange, onEdit, onDelete, triggerLabel = 'Actions de la tâche' }: StatusMenuProps) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const open = pos !== null;

  const close = (returnFocus = true) => {
    setPos(null);
    if (returnFocus) triggerRef.current?.focus();
  };

  const toggle = () => {
    if (open) return close();
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const menuHeight = 280;
    const top = r.bottom + menuHeight > window.innerHeight ? Math.max(8, r.top - menuHeight) : r.bottom + 4;
    setPos({ top, right: window.innerWidth - r.right });
  };

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role^="menuitem"]')?.focus();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !triggerRef.current?.contains(t)) setPos(null);
    };
    const onScroll = () => setPos(null);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  const onMenuKey = (e: React.KeyboardEvent) => {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? []);
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(i + 1) % items.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(i - 1 + items.length) % items.length]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      items[items.length - 1]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === 'Tab') {
      close(false);
    }
  };

  const itemClass =
    'flex w-full min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-ink hover:bg-brand-soft focus-visible:bg-brand-soft focus-visible:outline-none';

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={triggerLabel}
        title={triggerLabel}
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault();
            toggle();
          }
        }}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-[10px] text-body transition duration-150 hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 motion-reduce:transition-none"
      >
        <MoreVertical className="size-5" aria-hidden />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={triggerLabel}
            onKeyDown={onMenuKey}
            style={{ position: 'fixed', top: pos.top, right: pos.right }}
            className="z-[90] w-56 rounded-xl bg-surface p-2 shadow-card-lg ring-1 ring-line"
          >
            <p className="px-3 pb-1 pt-2 text-xs font-medium text-subtle" aria-hidden>
              Changer de statut
            </p>
            {TASK_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                role="menuitemradio"
                aria-checked={s === current}
                tabIndex={-1}
                onClick={() => {
                  close();
                  if (s !== current) onChange(s);
                }}
                className={itemClass}
              >
                <span aria-hidden className={cn('size-2.5 rounded-full', STATUS_STYLES[s].dot)} />
                <span className="flex-1">{STATUS_LABELS[s]}</span>
                {s === current && <Check className="size-4 text-brand" aria-hidden />}
              </button>
            ))}
            {(onEdit || onDelete) && <hr className="my-1 border-line" />}
            {onEdit && (
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={() => {
                  close(false);
                  onEdit();
                }}
                className={itemClass}
              >
                <Pencil className="size-4" aria-hidden />
                Modifier
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={() => {
                  close(false);
                  onDelete();
                }}
                className={cn(itemClass, 'text-red-700')}
              >
                <Trash2 className="size-4" aria-hidden />
                Supprimer
              </button>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
