'use client';

import { useEffect, useState } from 'react';
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
                <button className="btn" onClick={() => logout()}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="banner-link">
                  Sign in
                </Link>
                <Link href="/register" className="btn">
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
          </div>
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
