'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { useUser } from '@/components/public/UserProvider';

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const { refresh } = useUser();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      await refresh();
      router.push(next.startsWith('/') ? next : '/qa');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign in failed');
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 380, margin: '0 auto' }}>
      <div className="band" style={{ margin: '-8px -12px 14px' }}>
        Welcome back
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        Sign in to ask, answer, and comment.
      </p>

      <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
        <div>
          <label className="label" htmlFor="login-user">
            Username
          </label>
          <input id="login-user" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="login-pass">
            Password
          </label>
          <input id="login-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required className="input" />
        </div>
        {error ? <div className="alert alert-error">{error}</div> : null}
        <button type="submit" disabled={busy} className="btn btn-solid btn-block">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="muted" style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }}>
        New here?{' '}
        <Link href="/register">Create an account</Link>
      </p>
    </div>
  );
}
