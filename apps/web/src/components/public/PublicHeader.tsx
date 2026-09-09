'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/components/public/UserProvider';

const NAV = [
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
      <span className="wm-pink">U</span>
      <span className="wm-pink">m</span>
      <span className="wm-pink">b</span>
      <span className="wm-pink">r</span>
      <span className="wm-pink">e</span>
      <span className="wm-purple">l</span>
      <span className="wm-purple">l</span>
      <span className="wm-blue">a</span>
    </span>
  );
}

export function PublicHeader() {
  const { user, logout } = useUser();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved = localStorage.getItem('umbrella-theme');
    const initial =
      saved === 'dark' || saved === 'light'
        ? saved
        : window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
    setTheme(initial);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('umbrella-theme', theme);
  }, [theme]);

  return (
    <header className="site-header">
      <div className="container">
        <div className="site-header-inner">
          <Link href="/" className="nav-link" style={{ textDecoration: 'none' }}>
            <Wordmark />
          </Link>

          <nav className="site-nav" aria-label="Main">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${isActive(pathname, item.href) ? 'active' : ''}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {user ? (
              <>
                <span className="faint" style={{ fontSize: 11 }}>
                  @{user.username}
                </span>
                <button className="btn" onClick={() => logout()}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="nav-link">
                  Sign in
                </Link>
                <Link href="/register" className="btn btn-solid">
                  Join
                </Link>
              </>
            )}
            <button
              className="theme-toggle"
              aria-label="Toggle dark mode"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            >
              <span className="theme-icon-light">&#9728;</span>
              <span className="theme-icon-dark">&#9790;</span>
            </button>
            <button
              className={`nav-toggle ${menuOpen ? 'open' : ''}`}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((m) => !m)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </div>

      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={isActive(pathname, item.href) ? 'active' : ''}
            onClick={() => setMenuOpen(false)}
          >
            {item.label}
          </Link>
        ))}
        {user ? (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              logout();
            }}
          >
            Sign out (@{user.username})
          </a>
        ) : (
          <>
            <Link href="/login" onClick={() => setMenuOpen(false)}>
              Sign in
            </Link>
            <Link href="/register" onClick={() => setMenuOpen(false)}>
              Join
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
