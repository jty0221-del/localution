import type { Metadata, Viewport } from 'next';
import './globals.css';
import Sidebar from './components/Sidebar';
import { ServiceWorkerRegistrar } from './components/ServiceWorkerRegistrar';

export const metadata: Metadata = {
  title: '로컬루션 — 소상공인 AI 만능 비서',
  description: '소상공인을 위한 AI 마케팅·정산·고객관리 올인원 플랫폼',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '로컬루션',
  },
};

export const viewport: Viewport = {
  themeColor: '#3182F6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        <ServiceWorkerRegistrar />
        <div className="flex min-h-screen bg-[#F8FAFB]">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
