import type { Metadata, Viewport } from 'next';
import './globals.css';
import AppLayout from '@/components/common/AppLayout';

export const metadata: Metadata = {
  title: 'Infrastructure Mapping System — Kota Lubuklinggau',
  description:
    'Sistem inventarisasi, pemetaan GIS, dokumentasi, validasi, dan pengelolaan infrastruktur jaringan telekomunikasi Kota Lubuklinggau (Kominfo & Bapenda).',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'InfraMap LLG',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0d9488',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-teal-50/40 text-slate-800 antialiased selection:bg-teal-600 selection:text-white">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
