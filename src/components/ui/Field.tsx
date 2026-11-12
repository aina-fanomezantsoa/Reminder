import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

/** Classe commune des champs (input/select/textarea). */
export const controlClass = (invalid?: boolean) =>
  cn(
    'w-full rounded-[10px] bg-surface px-4 py-2 text-sm text-ink placeholder:text-subtle',
    'border outline-none transition duration-150 motion-reduce:transition-none',
    'focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:bg-stage disabled:text-subtle',
    invalid ? 'border-red-600' : 'border-line focus-visible:border-brand',
  );

/** Étiquette + contrôle + erreur liée (aria-describedby / aria-invalid injectés dans l'enfant). */
export function Field({ label, htmlFor, error, hint, required, children, className }: FieldProps) {
  const errorId = `${htmlFor}-error`;
  const hintId = `${htmlFor}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id: htmlFor,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
        'aria-required': required || undefined,
      })
    : children;
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
        {required && (
          <span className="ml-1 text-red-700">
            <span aria-hidden>*</span>
            <span className="sr-only"> (obligatoire)</span>
          </span>
        )}
      </label>
      {control}
      {hint && (
        <p id={hintId} className="text-xs text-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-start gap-2 text-xs font-medium text-red-700">
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}
