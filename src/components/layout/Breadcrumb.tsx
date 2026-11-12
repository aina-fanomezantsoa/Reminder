import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Fil d'Ariane">
      <ol className="flex items-center gap-2 text-sm font-medium text-muted">
        {items.map((it, i) => {
          const last = i === items.length - 1;
          return (
            <li key={it.label} className="flex items-center gap-2">
              {i > 0 && <ChevronRight className="size-4" aria-hidden />}
              {last || !it.href ? (
                <span aria-current={last ? 'page' : undefined} className={last ? 'font-medium text-ink' : undefined}>
                  {it.label}
                </span>
              ) : (
                <Link href={it.href} className="rounded hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                  {it.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
