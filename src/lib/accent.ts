export type AccentName = 'ocean' | 'grape' | 'orchid' | 'sun';

const ACCENTS: readonly AccentName[] = ['ocean', 'grape', 'orchid', 'sun'];

/** Couleur d'accent stable d'une tâche : index = hash(id) mod 4 (DESIGN.md section 0). */
export function taskAccent(id: string): AccentName {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ACCENTS[(h >>> 0) % ACCENTS.length];
}

/** Classes statiques par accent. `onStrong` : texte lisible sur la couleur forte (encre sur ambre). */
export const ACCENT_CLASSES: Record<AccentName, { strong: string; soft: string; ink: string; onStrong: string; border: string; softBg50: string }> = {
  ocean: { strong: 'bg-ocean', soft: 'bg-ocean-soft', ink: 'text-ocean-ink', onStrong: 'text-white', border: 'border-ocean', softBg50: 'bg-ocean-soft/50' },
  grape: { strong: 'bg-grape', soft: 'bg-grape-soft', ink: 'text-grape-ink', onStrong: 'text-white', border: 'border-grape', softBg50: 'bg-grape-soft/50' },
  orchid: {
    strong: 'bg-orchid',
    soft: 'bg-orchid-soft',
    ink: 'text-orchid-ink',
    onStrong: 'text-white',
    border: 'border-orchid',
    softBg50: 'bg-orchid-soft/50',
  },
  sun: { strong: 'bg-sun', soft: 'bg-sun-soft', ink: 'text-sun-ink', onStrong: 'text-sun-ink', border: 'border-sun', softBg50: 'bg-sun-soft/50' },
};

/** Valeurs hexadécimales pour les SVG. */
export const ACCENT_HEX: Record<AccentName, { strong: string; soft: string; ink: string }> = {
  ocean: { strong: '#2563EB', soft: '#9DBDF5', ink: '#1E3A8A' },
  grape: { strong: '#7C3AED', soft: '#C9B6F8', ink: '#4C1D95' },
  orchid: { strong: '#C026D3', soft: '#F2B1F0', ink: '#701A75' },
  sun: { strong: '#F5B31B', soft: '#FBE2A1', ink: '#78350F' },
};
