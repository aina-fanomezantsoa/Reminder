export const LEADER_LOCK = 'reminder-scheduler';

/**
 * Élection d'un onglet leader via Web Locks : un seul onglet planifie.
 * Les autres attendent dans la file et prennent le relais quand le leader se ferme.
 * Sans Web Locks, l'onglet est leader d'office (la clé primaire de ReminderEvent reste la garantie anti-doublon).
 * Retourne une fonction d'arrêt (libère le verrou ou annule l'attente).
 */
export function runAsLeader(onLead: () => () => void): () => void {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  if (!locks?.request) {
    const stop = onLead();
    return stop;
  }
  const abort = new AbortController();
  let release: (() => void) | undefined;
  locks
    .request(LEADER_LOCK, { signal: abort.signal }, async () => {
      const stop = onLead();
      await new Promise<void>((resolve) => {
        release = () => {
          stop();
          resolve();
        };
      });
    })
    .catch(() => undefined); // AbortError à l'arrêt
  return () => {
    abort.abort();
    release?.();
  };
}
