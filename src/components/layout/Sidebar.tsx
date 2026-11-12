'use client';

import Link from 'next/link';
import { Bell, CalendarRange, LayoutDashboard, ListChecks, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export const NAV_ITEMS: ReadonlyArray<{ href: string; label: string; short: string; Icon: LucideIcon }> = [
  { href: '/', label: 'Tableau de bord', short: 'Accueil', Icon: LayoutDashboard },
  { href: '/tasks', label: 'Tâches', short: 'Tâches', Icon: ListChecks },
  { href: '/planning', label: 'Planning', short: 'Planning', Icon: CalendarRange },
  { href: '/reminders', label: 'Rappels', short: 'Rappels', Icon: Bell },
];

const isActive = (activeHref: string, href: string) => (href === '/' ? activeHref === '/' : activeHref === href || activeHref.startsWith(`${href}/`));

export interface SidebarProps {
  activeHref: string;
  /** Force le mode icônes seules (72 px). En dessous de `xl`, la barre est toujours réduite. */
  collapsed: boolean;
}

export function Sidebar({ activeHref, collapsed }: SidebarProps) {
  return (
    <aside className={cn('sticky top-0 hidden h-dvh shrink-0 flex-col px-3 py-6 md:flex', collapsed ? 'w-[72px]' : 'w-[72px] xl:w-60')}>
      <div className={cn('mb-8 flex items-center gap-3 px-2', collapsed ? 'justify-center' : 'justify-center xl:justify-start')}>
        <Logo />
        <span className={cn('font-display text-lg font-semibold text-ink', collapsed ? 'hidden' : 'hidden xl:inline')}>Reminder</span>
      </div>
      <nav aria-label="Navigation principale">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = isActive(activeHref, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  aria-label={label}
                  title={label}
                  className={cn(
                    'flex min-h-9 items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition duration-150 motion-reduce:transition-none',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
                    collapsed ? 'justify-center' : 'justify-center xl:justify-start',
                    active ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-white hover:text-ink',
                  )}
                >
                  <Icon className="size-5 shrink-0" aria-hidden />
                  <span className={collapsed ? 'hidden' : 'hidden xl:inline'}>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

/** Barre d'onglets fixe en bas (mobile, < 768 px). */
export function BottomNav({ activeHref }: { activeHref: string }) {
  return (
    <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface md:hidden">
      <ul className="grid grid-cols-4">
        {NAV_ITEMS.map(({ href, short, Icon }) => {
          const active = isActive(activeHref, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand',
                  active ? 'text-brand' : 'text-muted',
                )}
              >
                <Icon className="size-5" aria-hidden />
                {short}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className={cn('size-9 shrink-0', className)}>
      <rect x="9" y="1" width="14" height="14" rx="3" transform="rotate(45 16 8)" fill="#2563EB" />
      <rect x="9" y="17" width="14" height="14" rx="3" transform="rotate(45 16 24)" fill="#2563EB" />
    </svg>
  );
}
