'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { useUser } from '@/components/public/UserProvider';

export function RegisterForm() {
  const router = useRouter();
  const { refresh } = useUser();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: username.trim(),
          password,
          displayName: displayName.trim() || undefined,
          pronouns: pronouns.trim() || undefined
        })
      });
      await refresh();
      router.push('/qa');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed');
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 380, margin: '0 auto' }}>
      <div className="band" style={{ margin: '-8px -12px 14px' }}>
        Join Umbrella.lgbt
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        A free account to ask questions and share answers.
      </p>

      <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
        <div>
          <label className="label" htmlFor="reg-user">
            Username
          </label>
          <input id="reg-user" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required placeholder="letters, numbers, underscores" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="reg-pass">
            Password
          </label>
          <input id="reg-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required placeholder="At least 8 characters" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="reg-name">
            Display name (optional)
          </label>
          <input id="reg-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="reg-pronouns">
            Pronouns (optional)
          </label>
          <input id="reg-pronouns" value={pronouns} onChange={(e) => setPronouns(e.target.value)} placeholder="e.g. they/them" className="input" />
        </div>
        {error ? <div className="alert alert-error">{error}</div> : null}
        <button type="submit" disabled={busy} className="btn btn-solid btn-block">
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="muted" style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }}>
        Already have an account?{' '}
        <Link href="/login">Sign in</Link>
      </p>
    </div>
  );
}
