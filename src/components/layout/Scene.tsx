import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Grand panneau bleu clair central de la maquette ("scène"). */
export function Scene({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-[20px] bg-stage p-4 sm:p-6', className)}>{children}</div>;
}
