'use client';

import { useSyncExternalStore } from 'react';
import { todayLocal } from '@/domain/dates';
import type { LocalDate } from '@/domain/types';

const subscribe = (cb: () => void) => {
  const id = window.setInterval(cb, 60_000);
  return () => window.clearInterval(id);
};

/** Date du jour (locale). Chaîne vide côté serveur / pendant l'hydratation. */
export function useToday(): LocalDate {
  return useSyncExternalStore(
    subscribe,
    () => todayLocal(),
    () => '',
  );
}

const noopSubscribe = (cb: () => void) => {
  const mq = window.matchMedia('(max-width: 767px)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};

/** true sous 768 px (mobile). */
export function useIsMobile(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => window.matchMedia('(max-width: 767px)').matches,
    () => false,
  );
}
