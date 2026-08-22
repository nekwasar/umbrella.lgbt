'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/admin-api';
import { Banner, Button, Field, Input } from '@/components/admin/ui';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api('/api/auth/admin/me')
      .then(() => router.replace('/admin'))
      .catch(() => {});
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api('/api/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      router.replace('/admin');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-serif text-3xl font-bold tracking-tight text-ink">
            Umbrella<span className="text-brand">.</span>lgbt
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-faint">Admin console</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-card border border-line bg-surface p-6 shadow-card"
        >
          <div className="space-y-4">
            <Field label="Username">
              <Input
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </Field>
            {error ? <Banner kind="error">{error}</Banner> : null}
            <Button type="submit" loading={loading} className="w-full">
              Sign in
            </Button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-faint">
          Authorized administrators only. All access is logged.
        </p>
      </div>
    </div>
  );
}
