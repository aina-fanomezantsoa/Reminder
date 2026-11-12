'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { ConfirmDialog } from './ConfirmDialog';

/**
 * Confirmation à la fermeture d'un formulaire modifié (Échap, croix, clic hors modale, Annuler).
 * `requestClose` ferme directement si rien n'a changé, sinon ouvre la confirmation.
 * `dialog` est à rendre à côté de la modale du formulaire.
 */
export function useDirtyGuard(dirty: boolean, onClose: () => void): { requestClose: () => void; dialog: ReactNode } {
  const [asking, setAsking] = useState(false);
  const requestClose = useCallback(() => {
    if (dirty) setAsking(true);
    else onClose();
  }, [dirty, onClose]);

  const dialog = (
    <ConfirmDialog
      open={asking}
      title="Abandonner les modifications ?"
      description="Les changements saisis dans ce formulaire n'ont pas été enregistrés et seront perdus."
      confirmLabel="Abandonner"
      tone="danger"
      onCancel={() => setAsking(false)}
      onConfirm={() => {
        setAsking(false);
        onClose();
      }}
    />
  );
  return { requestClose, dialog };
}
