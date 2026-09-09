'use client';

import { useEffect, useState } from 'react';

export function ThemeToggle() {
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
    <span className="footer-theme">
      Theme:{' '}
      {theme === 'light' ? (
        <span style={{ fontWeight: 700 }}>Light</span>
      ) : (
        <button onClick={() => setTheme('light')}>Light</button>
      )}{' '}
      /{' '}
      {theme === 'dark' ? (
        <span style={{ fontWeight: 700 }}>Dark</span>
      ) : (
        <button onClick={() => setTheme('dark')}>Dark</button>
      )}
    </span>
  );
}
