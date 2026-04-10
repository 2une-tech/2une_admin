'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Briefcase, ListChecks, Users, FileText, Activity, LogOut } from 'lucide-react';
import { useRequireAdmin } from '../../lib/useRequireAdmin';
import { useAuthStore } from '../../lib/store';
import { BrandLogo } from '@/components/BrandLogo';

const navItems: Array<{ href: string; label: string; icon: React.ReactNode }> = [
  { href: '/', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: '/projects', label: 'Projects', icon: <Briefcase className="h-4 w-4" /> },
  { href: '/tasks', label: 'Tasks', icon: <ListChecks className="h-4 w-4" /> },
  { href: '/applications', label: 'Applications', icon: <FileText className="h-4 w-4" /> },
  { href: '/users', label: 'Users', icon: <Users className="h-4 w-4" /> },
  { href: '/events', label: 'Events', icon: <Activity className="h-4 w-4" /> },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAllowed, user } = useRequireAdmin();
  const { logout } = useAuthStore();

  if (!isAllowed) return null;

  return (
    <div className="flex min-h-full flex-1 bg-zinc-50">
      <aside className="hidden w-64 flex-col border-r border-zinc-200 bg-white p-4 md:flex">
        <div className="mb-6 flex items-start gap-3">
          <BrandLogo size={24} />
          <div className="min-w-0">
            <div className="text-sm font-semibold">2une Admin</div>
            <div className="mt-1 truncate text-xs text-zinc-600">{user?.email}</div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm',
                  active ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100',
                ].join(' ')}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => void logout()}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-50"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </aside>

      <main className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 md:px-6">
          <div className="text-sm font-medium text-zinc-900">
            {navItems.find((n) => n.href !== '/' && pathname.startsWith(n.href))?.label ??
              (pathname === '/' ? 'Dashboard' : 'Admin')}
          </div>
          <div className="text-xs text-zinc-600 md:hidden">{user?.email}</div>
        </header>
        <div className="flex flex-1 flex-col p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}

