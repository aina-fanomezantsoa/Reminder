'use client';

import { useState } from 'react';
import { Bell, BellOff, BellRing, Info } from 'lucide-react';
import type { PermissionState } from '@/domain/types';
import { Button } from '@/components/ui/Button';

export interface NotificationBannerProps {
  permission: PermissionState;
  /** Appelé sur clic uniquement (jamais au chargement, CA-R5.1). */
  onRequest: () => Promise<PermissionState>;
}

export const OPEN_TAB_NOTICE = 'Les notifications ne sont envoyées que lorsque Reminder est ouvert dans un onglet du navigateur.';

/** Bandeau de permission de notification : 4 variantes (default, granted, denied, unsupported). */
export function NotificationBanner({ permission, onRequest }: NotificationBannerProps) {
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);

  if (permission === 'granted') {
    return (
      <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-green-100 px-4 py-3 text-sm font-medium text-st-done-ink">
        <BellRing className="size-5 shrink-0" aria-hidden />
        <p className="min-w-0 flex-1">Notifications actives. {OPEN_TAB_NOTICE.replace('Les notifications ne sont envoyées', 'Elles ne sont envoyées')}</p>
        <span className="inline-flex items-center gap-2 text-xs font-medium">
          <span aria-hidden className="size-2 rounded-full bg-st-done" />
          Actif
        </span>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <section aria-labelledby="nb-denied" className="flex gap-4 rounded-2xl bg-amber-100 p-5 text-amber-900">
        <BellOff className="mt-0.5 size-6 shrink-0" aria-hidden />
        <div className="flex flex-col gap-2">
          <h2 id="nb-denied" className="font-display text-base font-semibold">
            Les notifications sont bloquées
          </h2>
          <p className="text-sm">
            Vos rappels s&apos;afficheront ici, dans l&apos;application, mais vous ne recevrez pas d&apos;alerte système. Pour les réactiver, autorisez les
            notifications pour ce site dans les réglages de votre navigateur (icône de cadenas dans la barre d&apos;adresse).
          </p>
          <button
            type="button"
            aria-expanded={help}
            onClick={() => setHelp((v) => !v)}
            className="self-start rounded text-sm font-medium underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            Comment faire ?
          </button>
          {help && (
            <ol className="list-decimal pl-5 text-sm">
              <li>Cliquez sur l&apos;icône de cadenas à gauche de l&apos;adresse du site.</li>
              <li>Repérez le réglage « Notifications » et choisissez « Autoriser ».</li>
              <li>Revenez sur cet onglet : l&apos;état se met à jour tout seul.</li>
            </ol>
          )}
        </div>
      </section>
    );
  }

  if (permission === 'unsupported') {
    return (
      <div role="status" className="flex items-start gap-3 rounded-2xl bg-stage p-4 text-sm text-body">
        <Info className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
        <p>Votre navigateur ne gère pas les notifications. Les rappels restent visibles dans l&apos;application.</p>
      </div>
    );
  }

  return (
    <section aria-labelledby="nb-default" className="flex flex-col gap-4 rounded-2xl bg-brand-soft p-5 text-ink sm:flex-row sm:items-center">
      <Bell className="size-6 shrink-0" aria-hidden />
      <div className="flex flex-1 flex-col gap-1">
        <h2 id="nb-default" className="font-display text-base font-semibold">
          Activez les notifications pour ne rien oublier
        </h2>
        <p className="text-sm">Reminder vous prévient à l&apos;heure de chaque rappel. Le navigateur va vous demander l&apos;autorisation.</p>
        <p className="text-xs">{OPEN_TAB_NOTICE}</p>
      </div>
      <Button
        loading={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onRequest();
          } finally {
            setBusy(false);
          }
        }}
      >
        Activer les notifications
      </Button>
    </section>
  );
}
