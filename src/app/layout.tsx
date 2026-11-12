import type { Metadata, Viewport } from 'next';
import { Inter, Montserrat } from 'next/font/google';
import { AppShell } from '@/components/layout/AppShell';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

const montserrat = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin'],
  weight: ['500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Reminder',
  description: 'Tâches, planning et rappels, stockés sur votre appareil.',
};

// viewport-fit=cover : permet d'utiliser env(safe-area-inset-*) (encoche, barre de gestes).
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${montserrat.variable} antialiased`}>
      <body className="min-h-dvh bg-canvas font-sans text-body">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
