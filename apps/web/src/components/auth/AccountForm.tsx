'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { useUser } from '@/components/public/UserProvider';

export function AccountForm() {
  const { user, loading, refresh } = useUser();
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) {
    return <p className="muted">Loading your account…</p>;
  }

  if (!user) {
    return (
      <div className="alert">
        You need an account to do this.{' '}
        <Link href="/login">Sign in</Link> or <Link href="/register">Join</Link>.
      </div>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await api<{ user: { username: string } }>('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ username: username.trim() })
      });
      await refresh();
      setNotice(`Username changed to @${res.user.username}.`);
      setUsername('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not change username');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <p className="muted" style={{ marginTop: 0 }}>
        Signed in as <strong>@{user.username}</strong>
      </p>

      <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
        <div>
          <label className="label" htmlFor="new-username">
            New username
          </label>
          <input
            id="new-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="off"
            required
            minLength={2}
            maxLength={30}
            pattern="[a-zA-Z0-9_]+"
            title="Letters, numbers and underscores only"
            placeholder="letters, numbers, underscores"
            className="input"
          />
          <div className="faint" style={{ marginTop: 4 }}>
            2–30 characters · letters, numbers, underscores. This changes the name shown on your
            posts.
          </div>
        </div>
        {error ? <div className="alert alert-error">{error}</div> : null}
        {notice ? <div className="alert alert-success">{notice}</div> : null}
        <div>
          <button type="submit" disabled={busy} className="btn btn-solid">
            {busy ? 'Saving…' : 'Change username'}
          </button>
        </div>
      </form>
    </div>
  );
}
