'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Building2, Users, Upload, Activity, Settings } from 'lucide-react';
import { clsx } from 'clsx';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/departments', label: 'Departments', icon: Building2 },
  { href: '/employees', label: 'Employees', icon: Users },
  { href: '/upload', label: 'Data Upload', icon: Upload },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white lg:block">
      <div className="flex h-full flex-col">
        {/* Brand */}
        <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900">Connectivity</h1>
            <p className="text-xs text-gray-500">Employee Index</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4">
          <p className="text-xs text-gray-400">INGETEC I&D S.A.S.</p>
          <p className="text-xs text-gray-400">v1.0.0</p>
        </div>
      </div>
    </aside>
  );
}
