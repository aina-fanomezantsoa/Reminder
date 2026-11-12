import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '@/lib/cn';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  label: string;
  icon: ReactNode;
  tone?: 'default' | 'danger';
  ref?: Ref<HTMLButtonElement>;
}

/** Bouton icône : zone tactile 44 px, `label` obligatoire (aria-label + infobulle). */
export function IconButton({ label, icon, tone = 'default', className, type = 'button', ref, ...rest }: IconButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-[10px] transition duration-150 motion-reduce:transition-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
        tone === 'danger' ? 'text-red-700 hover:bg-red-100' : 'text-body hover:bg-brand-soft',
        className,
      )}
      {...rest}
    >
      <span aria-hidden className="inline-flex">
        {icon}
      </span>
    </button>
  );
}
