'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/components/public/UserProvider';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/blog', label: 'Blog' },
  { href: '/glossary', label: 'Glossary' },
  { href: '/qa', label: 'Q&A' },
  { href: '/city', label: 'Cities' },
  { href: '/resources', label: 'Resources' },
  { href: '/contact', label: 'Contact' }
];

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function Wordmark({ size = 18 }: { size?: number }) {
  return (
    <span className="wordmark" style={{ fontSize: size }} aria-label="Umbrella.lgbt">
      <span className="wm-red">U</span>
      <span className="wm-orange">m</span>
      <span className="wm-yellow">b</span>
      <span className="wm-green">r</span>
      <span className="wm-cyan">e</span>
      <span className="wm-royal">l</span>
      <span className="wm-indigo">l</span>
      <span className="wm-violet">a</span>
    </span>
  );
}

export function PublicHeader() {
  const { user, logout } = useUser();
  const pathname = usePathname();

  return (
    <header>
      <div className="top-banner">
        <div className="container top-banner-inner">
          <Link href="/" className="banner-home" aria-label="Umbrella.lgbt home">
            <Wordmark />
          </Link>

          <div className="banner-side">
            {user ? (
              <>
                <span className="banner-user">@{user.username}</span>
                <span className="banner-sep" aria-hidden="true">
                  |
                </span>
                <button className="banner-text-btn" onClick={() => logout()}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="banner-text-link">
                  Sign in
                </Link>
                <span className="banner-sep" aria-hidden="true">
                  |
                </span>
                <Link href="/register" className="banner-text-link">
                  Join
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="banner-search">
        <div className="container">
          <form action="/search" method="get" role="search" className="banner-search-form">
            <label htmlFor="banner-search-q">Search:</label>
            <input id="banner-search-q" type="text" name="q" autoComplete="off" />
            <button type="submit" className="btn-search">
              Search
            </button>
          </form>
        </div>
      </div>

      <nav className="subnav" aria-label="Main">
        <div className="container subnav-inner">
          {NAV.map((item, i) => (
            <span key={item.href}>
              {i > 0 ? (
                <span className="sep" aria-hidden="true">
                  |
                </span>
              ) : null}
              <Link
                href={item.href}
                className={isActive(pathname, item.href) ? 'active' : ''}
              >
                {item.label}
              </Link>
            </span>
          ))}
        </div>
      </nav>
    </header>
  );
}
