'use client';

import { useId, type ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  tone?: 'danger' | 'neutral';
  onConfirm: () => void;
  onCancel: () => void;
}

/** `role="alertdialog"`, focus initial sur Annuler. */
export function ConfirmDialog({ open, title, description, confirmLabel, tone = 'danger', onConfirm, onCancel }: ConfirmDialogProps) {
  const descId = useId();
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      role="alertdialog"
      describedBy={descId}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} data-autofocus>
            Annuler
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div id={descId} className="py-2 text-sm leading-relaxed text-body">
        {description}
      </div>
    </Modal>
  );
}
