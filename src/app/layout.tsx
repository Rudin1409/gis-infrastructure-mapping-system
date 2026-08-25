import type { Metadata, Viewport } from 'next';
import './globals.css';
import AppLayout from '@/components/common/AppLayout';

export const metadata: Metadata = {
  title: 'InfraMap GIS — Sistem Pemetaan Infrastruktur Kota Lubuklinggau',
  description:
    'Sistem inventarisasi spasial, pemetaan GIS, dokumentasi tiang FO, PJU, dan jaringan telekomunikasi Kota Lubuklinggau.',
  icons: {
    icon: '/images/app-logo.png',
    shortcut: '/images/app-logo.png',
    apple: '/images/app-logo.png',
  },
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
