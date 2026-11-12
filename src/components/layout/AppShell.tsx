'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { CalendarClock, Menu } from 'lucide-react';
import { useNotificationPermission, useProfile } from '@/data/hooks';
import { settingsService } from '@/data/services/settings';
import { useToday } from '@/lib/use-today';
import { useMediaQuery } from '@/lib/use-media';
import { notificationService } from '@/notifications/scheduler';
import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb';
import { NotificationStatusChip } from './NotificationStatusChip';
import { RightPanel } from './RightPanel';
import { BottomNav, Sidebar } from './Sidebar';
import { ToastProvider } from '@/components/ui/Toast';
import { TaskEditorProvider } from '@/components/tasks/TaskEditorProvider';
import { IconButton } from '@/components/ui/IconButton';
import { Drawer } from '@/components/ui/Drawer';
import { ReminderEditorProvider } from '@/components/reminders/ReminderEditorProvider';
import { MissedBannerHost } from '@/components/reminders/MissedBannerHost';
import { StorageGuard } from './StorageGuard';
import { TimerTitle } from './TimerTitle';
import { TimerResumeHost } from '@/components/plan-day/TimerResumeBanner';

function breadcrumbFor(pathname: string): BreadcrumbItem[] {
  if (pathname.startsWith('/tasks')) return [{ label: 'Tâches', href: '/tasks' }, { label: "Aujourd'hui" }];
  if (pathname.startsWith('/planning')) return [{ label: 'Planning' }];
  if (pathname.startsWith('/reminders')) return [{ label: 'Rappels' }];
  return [{ label: 'Tableau de bord' }];
}

/** Coquille : sidebar, en-tête (fil d'Ariane + état des notifications), contenu, panneau droit. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/';
  const [collapsed, setCollapsed] = useState(false);
  const permission = useNotificationPermission();
  const profile = useProfile();
  const today = useToday();
  const isDashboard = pathname === '/';
  // En dessous de 1024 px, le panneau droit devient un tiroir « Aujourd'hui » ouvert depuis l'en-tête.
  const compact = useMediaQuery('(max-width: 1023px)');
  // Le tiroir est lié à la page où il a été ouvert : il se ferme tout seul quand on navigue.
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const drawerOpen = compact && drawerPath === pathname;
  const setDrawerOpen = (open: boolean) => setDrawerPath(open ? pathname : null);

  // Planificateur de rappels : lancé une fois (idempotent), arrêté au démontage.
  useEffect(() => {
    notificationService.start();
    return () => notificationService.stop();
  }, []);

  const panel = (
    <RightPanel
      variant={isDashboard ? 'compact' : 'full'}
      profile={profile}
      date={today}
      onRenameProfile={(displayName) => settingsService.setProfile({ displayName })}
    />
  );

  return (
    <ToastProvider>
      <ReminderEditorProvider>
        <TaskEditorProvider>
          <a
            href="#contenu"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
          >
            Aller au contenu
          </a>
          <div className="flex min-h-dvh">
            <Sidebar activeHref={pathname} collapsed={collapsed} />
            <div className="flex min-w-0 flex-1 flex-col">
              <header className="flex items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:py-4 md:px-8">
                <div className="flex items-center gap-2">
                  <IconButton
                    label={collapsed ? 'Déplier le menu' : 'Réduire le menu'}
                    icon={<Menu className="size-5" />}
                    className="hidden xl:inline-flex"
                    aria-expanded={!collapsed}
                    onClick={() => setCollapsed((v) => !v)}
                  />
                  <Breadcrumb items={breadcrumbFor(pathname)} />
                </div>
                <div className="flex items-center gap-2">
                  {compact && (
                    <IconButton
                      label="Aujourd'hui : plan et statistiques"
                      icon={<CalendarClock className="size-5" />}
                      aria-haspopup="dialog"
                      onClick={() => setDrawerOpen(true)}
                      className="bg-surface shadow-pill"
                    />
                  )}
                  <NotificationStatusChip permission={permission} />
                </div>
              </header>
              <div className="flex flex-1 flex-col gap-8 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-8 md:pb-10 xl:flex-row">
                <main id="contenu" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
                  <MissedBannerHost />
                  <TimerResumeHost />
                  <StorageGuard>{children}</StorageGuard>
                </main>
                {!compact && (
                  <aside aria-label="Panneau latéral" className="shrink-0 xl:w-80">
                    {panel}
                  </aside>
                )}
              </div>
            </div>
          </div>
          <TimerTitle />
          <BottomNav activeHref={pathname} />
          <Drawer open={drawerOpen} title="Aujourd'hui" onClose={() => setDrawerOpen(false)}>
            {panel}
          </Drawer>
        </TaskEditorProvider>
      </ReminderEditorProvider>
    </ToastProvider>
  );
}
