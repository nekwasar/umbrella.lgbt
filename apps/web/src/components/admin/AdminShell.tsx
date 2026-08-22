'use client';

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/admin-api';
import { Admin } from '@/lib/types';
import { Spinner } from '@/components/admin/ui';

const AdminContext = createContext<{ admin: Admin | null; setAdmin: (a: Admin | null) => void }>({
  admin: null,
  setAdmin: () => {}
});

export const useAdmin = () => useContext(AdminContext);

const NAV = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/pages', label: 'Pages', exact: false },
  { href: '/admin/pages/new', label: 'New Page', exact: true },
  { href: '/admin/meta', label: 'Meta Editor', exact: true },
  { href: '/admin/admins', label: 'Admins', exact: true },
  { href: '/admin/users', label: 'Users', exact: true }
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [state, setState] = useState<'loading' | 'authed' | 'anon'>('loading');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api<{ admin: Admin }>('/api/auth/admin/me');
        if (!active) return;
        setAdmin(res.admin);
        setState('authed');
      } catch (err) {
        if (!active) return;
        setState('anon');
        if (err instanceof ApiError && err.status === 401 && pathname !== '/admin/login') {
          router.replace('/admin/login');
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [pathname, router]);

  const logout = useCallback(async () => {
    await api('/api/auth/admin/logout', { method: 'POST' }).catch(() => {});
    setAdmin(null);
    router.replace('/admin/login');
  }, [router]);

  // Login page renders standalone (no sidebar)
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8 text-muted" />
      </div>
    );
  }

  if (state === 'anon') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Link href="/admin/login" className="text-sm font-semibold text-brand hover:underline">
          Sign in to continue
        </Link>
      </div>
    );
  }

  return (
    <AdminContext.Provider value={{ admin, setAdmin }}>
      <div className="flex min-h-screen">
        <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-line bg-surface">
          <div className="border-b border-line px-5 py-5">
            <Link href="/admin" className="font-serif text-lg font-bold tracking-tight text-ink">
              Umbrella<span className="text-brand">.</span>lgbt
            </Link>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-widest text-faint">Admin</p>
          </div>

          <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
            {NAV.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-line/40 hover:text-ink'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-line px-4 py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">@{admin?.username}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">
                  {admin?.role === 'SUPER_ADMIN' ? 'Super admin' : 'Admin'}
                </p>
              </div>
              <button
                onClick={logout}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-muted transition hover:bg-line/40 hover:text-ink"
              >
                Sign out
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}
