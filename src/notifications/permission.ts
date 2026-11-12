import type { PermissionState } from '@/domain/types';

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function getPermission(): PermissionState {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission as PermissionState; // 'default' | 'granted' | 'denied'
}

/** À appeler sur un clic utilisateur (CA-R5.1). Ne lève jamais. */
export async function requestPermission(): Promise<PermissionState> {
  if (getPermission() === 'unsupported') return 'unsupported';
  try {
    await Notification.requestPermission();
  } catch {
    // anciens Safari (callback) ou refus : l'état réel est relu ci-dessous
  }
  emit();
  return getPermission();
}

/** Abonnement (useSyncExternalStore) : focus, visibilité, et changement du réglage navigateur si exposé. */
export function subscribePermission(cb: () => void): () => void {
  listeners.add(cb);
  if (typeof window === 'undefined') return () => listeners.delete(cb);
  window.addEventListener('focus', cb);
  document.addEventListener('visibilitychange', cb);
  let status: PermissionStatus | undefined;
  let disposed = false;
  navigator.permissions
    ?.query({ name: 'notifications' })
    .then((s) => {
      if (disposed) return;
      status = s;
      s.addEventListener('change', cb);
    })
    .catch(() => undefined);
  return () => {
    disposed = true;
    listeners.delete(cb);
    window.removeEventListener('focus', cb);
    document.removeEventListener('visibilitychange', cb);
    status?.removeEventListener('change', cb);
  };
}
