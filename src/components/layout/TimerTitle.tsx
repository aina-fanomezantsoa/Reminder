'use client';

import { useEffect, useRef } from 'react';
import { clock, useRunningTimer } from './useRunningTimer';

/** `document.title` = `⏱ 12:03 · tâche` pendant le chrono ; titre d'origine restauré à l'arrêt. */
export function TimerTitle() {
  const timer = useRunningTimer();
  const text = timer ? `⏱ ${clock(timer.elapsed)} · ${timer.title}` : null;
  const origin = useRef<string | null>(null);

  useEffect(() => {
    if (!text) {
      if (origin.current !== null) document.title = origin.current;
      origin.current = null;
      return;
    }
    origin.current ??= document.title;
    document.title = text;
    // Next réécrit le titre à la navigation : on mémorise le nouveau titre et on ré-applique le nôtre.
    const obs = new MutationObserver(() => {
      if (document.title === text) return;
      origin.current = document.title;
      document.title = text;
    });
    obs.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => obs.disconnect();
  }, [text]);

  // Démontage : restaure le titre.
  useEffect(() => () => void (origin.current !== null && (document.title = origin.current)), []);

  return null;
}
