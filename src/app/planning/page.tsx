import { Suspense } from 'react';
import { PlanningView } from './PlanningView';

export default function PlanningPage() {
  // useSearchParams (onglet mémorisé dans l'URL) exige un Suspense pour l'export statique.
  return (
    <Suspense fallback={null}>
      <PlanningView />
    </Suspense>
  );
}
