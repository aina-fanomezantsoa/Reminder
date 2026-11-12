'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { DatabaseZap } from 'lucide-react';
import { settingsService } from '@/data/services/settings';
import { Button } from '@/components/ui/Button';

type Health = 'checking' | 'ok' | 'error';

/**
 * Vérifie que le stockage local (IndexedDB) est utilisable. S'il ne l'est pas (navigation privée de certains
 * navigateurs, stockage bloqué), remplace le contenu par un écran d'erreur : aucune donnée n'est affichée
 * comme si tout allait bien.
 */
export function StorageGuard({ children }: { children: ReactNode }) {
  const [health, setHealth] = useState<Health>('checking');

  const probe = useCallback(() => {
    let cancelled = false;
    settingsService
      .getProfile()
      .then(() => !cancelled && setHealth('ok'))
      .catch(() => !cancelled && setHealth('error'));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => probe(), [probe]);

  if (health !== 'error') return <>{children}</>;

  return (
    <div role="alert" className="flex flex-col items-center gap-4 rounded-[20px] bg-stage px-6 py-16 text-center">
      <span aria-hidden className="flex size-14 items-center justify-center rounded-full bg-red-100 text-red-700">
        <DatabaseZap className="size-7" />
      </span>
      <h1 className="font-display text-2xl font-semibold text-ink">Reminder ne peut pas enregistrer vos données sur cet appareil.</h1>
      <p className="max-w-md text-sm text-body">Le stockage local du navigateur est indisponible (navigation privée ou stockage bloqué).</p>
      <Button
        onClick={() => {
          setHealth('checking');
          probe();
        }}
      >
        Réessayer
      </Button>
    </div>
  );
}
