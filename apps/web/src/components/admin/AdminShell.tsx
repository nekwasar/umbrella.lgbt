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

type IconName =
  | 'home'
  | 'folder'
  | 'doc'
  | 'plus'
  | 'chat'
  | 'help'
  | 'megaphone'
  | 'users'
  | 'shield'
  | 'gavel';

const ICON_PATHS: Record<IconName, ReactNode> = {
  home: <path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" />,
  folder: <path d="M3 6a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" />,
  doc: (
    <>
      <path d="M6 2h7l5 5v13a1 1 0 01-1 1H6a1 1 0 01-1-1V3a1 1 0 011-1z" />
      <path d="M13 2v6h6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  chat: <path d="M21 12a8 8 0 01-8 8H5l-2 2V12a8 8 0 018-8h2a8 8 0 018 8z" />,
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.4 9.3a2.7 2.7 0 015.2.9c0 1.8-2.6 2.1-2.6 3.8" />
      <path d="M12 17.5h.01" />
    </>
  ),
  megaphone: <path d="M3 11l14-6v14l-14-6v-2zM17 8a4 4 0 010 6M3 11v4l4 1v-6l-4 1z" />,
  users: <path d="M17 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9 11a4 4 0 100-8 4 4 0 000 8zM21 20v-1a4 4 0 00-3-3.87M15 3.13A4 4 0 0119 7a4 4 0 01-4 4" />,
  shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />,
  gavel: <path d="M12 4l9 15H3l9-15zM12 10v4M12 17h.01" />
};

function Icon({ name, className = 'h-4 w-4' }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

const NAV_GROUPS: Array<{ label: string; items: Array<{ href: string; label: string; icon: IconName; exact?: boolean }> }> = [
  {
    label: 'Content',
    items: [
      { href: '/admin', label: 'Dashboard', icon: 'home', exact: true },
      { href: '/admin/files', label: 'Files', icon: 'folder' },
      { href: '/admin/pages', label: 'Pages', icon: 'doc' },
      { href: '/admin/pages/new', label: 'New Page', icon: 'plus', exact: true }
    ]
  },
  {
    label: 'Community',
    items: [
      { href: '/admin/forum', label: 'Forum', icon: 'chat' },
      { href: '/admin/qa', label: 'Q&A', icon: 'help' },
      { href: '/admin/bulletins', label: 'Bulletins', icon: 'megaphone' }
    ]
  },
  {
    label: 'People & Safety',
    items: [
      { href: '/admin/users', label: 'Users', icon: 'users', exact: true },
      { href: '/admin/admins', label: 'Admins', icon: 'shield', exact: true },
      { href: '/admin/moderation', label: 'Moderation', icon: 'gavel' }
    ]
  }
];

function currentSection(pathname: string): { label: string; icon: IconName } {
  for (const g of NAV_GROUPS) {
    for (const item of g.items) {
      const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
      if (active) return { label: item.label, icon: item.icon };
    }
  }
  return { label: 'Admin', icon: 'home' };
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="space-y-4 px-3 py-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-faint">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active
                      ? 'bg-brand-soft text-brand'
                      : 'text-muted hover:bg-line/40 hover:text-ink'
                  }`}
                >
                  {active ? (
                    <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-brand" aria-hidden="true" />
                  ) : null}
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function UserFooter({ admin, logout }: { admin: Admin | null; logout: () => void }) {
  return (
    <div className="border-t border-line bg-canvas/60 px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">@{admin?.username}</p>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">
            {admin?.role === 'SUPER_ADMIN' ? 'Super admin' : 'Admin'}
          </p>
        </div>
        <button
          onClick={logout}
          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:bg-line/40 hover:text-ink"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [state, setState] = useState<'loading' | 'authed' | 'anon'>('loading');
  const [drawer, setDrawer] = useState(false);

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
    setDrawer(false);
    router.replace('/admin/login');
  }, [router]);

  useEffect(() => {
    setDrawer(false);
  }, [pathname]);

  // Login page renders standalone (no sidebar)
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="text-center">
          <Spinner className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-faint">Loading console…</p>
        </div>
      </div>
    );
  }

  if (state === 'anon') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <CardShell>
          <p className="text-sm font-semibold text-ink">Session expired</p>
          <Link href="/admin/login" className="mt-2 inline-block text-sm font-semibold text-brand hover:underline">
            Sign in to continue →
          </Link>
        </CardShell>
      </div>
    );
  }

  const section = currentSection(pathname);

  return (
    <AdminContext.Provider value={{ admin, setAdmin }}>
      <div className="flex min-h-screen bg-canvas">
        {/* desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-surface lg:flex">
          <div className="border-b border-line px-5 py-5">
            <Link href="/admin" className="font-serif text-lg font-bold tracking-tight text-ink">
              Umbrella<span className="text-brand">.</span>lgbt
            </Link>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-widest text-faint">Admin console</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <NavLinks pathname={pathname} />
          </div>
          <UserFooter admin={admin} logout={logout} />
        </aside>

        {/* mobile drawer */}
        {drawer ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-ink/40" onClick={() => setDrawer(false)} aria-hidden="true" />
            <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-line bg-surface shadow-pop">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <span className="font-serif text-lg font-bold tracking-tight text-ink">
                  Umbrella<span className="text-brand">.</span>lgbt
                </span>
                <button
                  onClick={() => setDrawer(false)}
                  aria-label="Close menu"
                  className="rounded-lg p-1.5 text-muted transition hover:bg-line/40 hover:text-ink"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <NavLinks pathname={pathname} onNavigate={() => setDrawer(false)} />
              </div>
              <UserFooter admin={admin} logout={logout} />
            </aside>
          </div>
        ) : null}

        {/* main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* top bar */}
          <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
            <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 lg:px-6">
              <button
                onClick={() => setDrawer(true)}
                aria-label="Open menu"
                className="rounded-lg border border-line-strong p-2 text-ink transition hover:border-brand hover:text-brand lg:hidden"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" strokeLinecap="round">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="flex min-w-0 items-center gap-2 text-sm">
                <span className="text-muted">
                  <Icon name={section.icon} className="h-4 w-4" />
                </span>
                <span className="truncate font-semibold text-ink">{section.label}</span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <a
                  href="/"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-line-strong px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-brand hover:text-brand"
                >
                  View site ↗
                </a>
                <span className="hidden text-xs font-semibold text-faint sm:inline">@{admin?.username}</span>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-6 lg:py-8">{children}</main>

          <footer className="border-t border-line px-4 py-4 text-center text-[11px] text-faint lg:px-6">
            Umbrella.lgbt admin console · authorized access only
          </footer>
        </div>
      </div>
    </AdminContext.Provider>
  );
}

function CardShell({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-sm rounded-card border border-line bg-surface p-6 text-center shadow-card">
      {children}
    </div>
  );
}
