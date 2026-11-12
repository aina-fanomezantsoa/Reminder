/** Enregistre `/sw.js` (affichage des notifications et clic). Sans effet si non supporté ; ne lève jamais. */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | undefined> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return undefined;
  try {
    return await navigator.serviceWorker.register(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/sw.js`);
  } catch {
    return undefined;
  }
}

/**
 * Affiche la notification via le Service Worker (requis sur Android/Chrome), repli `new Notification()`.
 * `tag` = id de l'événement : évite un doublon visuel côté OS.
 */
export async function showSystemNotification(title: string, body: string | undefined, tag: string): Promise<void> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const options: NotificationOptions = { body, tag, data: { url: '/reminders' } };
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) {
      await reg.showNotification(title, options);
      return;
    }
  } catch {
    // repli ci-dessous
  }
  try {
    new Notification(title, options);
  } catch {
    // contexte interdisant le constructeur : rien de plus à faire, le toast in-app reste affiché
  }
}
