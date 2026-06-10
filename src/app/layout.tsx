import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import { NavBar } from '@/components/NavBar';

export const metadata: Metadata = {
  title: '万能导入 - 智能多格式批量下单系统',
  description: '通过AI大模型实现任意格式文件的智能解析与导入',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-gray-50 min-h-screen">
        <NavBar />
        <main className="max-w-7xl mx-auto px-4 py-6">
          {children}
        </main>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
