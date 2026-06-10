'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Upload, Settings, List } from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { href: '/', label: '文件导入', icon: Upload },
  { href: '/rules', label: '解析规则', icon: Settings },
  { href: '/orders', label: '运单列表', icon: List },
];

export function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center h-14">
        <Link href="/" className="flex items-center gap-2 mr-8">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
               style={{ background: '#0fc6c2' }}>
            万
          </div>
          <span className="font-semibold text-gray-800">万能导入</span>
        </Link>
        <div className="flex gap-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
                  isActive 
                    ? 'text-[#0fc6c2] bg-[#e8fafa] font-medium' 
                    : 'text-gray-600 hover:text-[#0fc6c2] hover:bg-gray-50'
                )}>
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
