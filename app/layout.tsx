import type { Metadata } from 'next';
import './globals.css';
import Sidebar from './components/Sidebar';

export const metadata: Metadata = {
  title: '로컬루션 | Localution AI',
  description: '소상공인 AI 만능 비서',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="flex h-screen bg-[#0f0f13] overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
