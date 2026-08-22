'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/admin-api';
import { PublicUserRow, UserListResponse } from '@/lib/types';
import {
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Spinner
} from '@/components/admin/ui';

export default function UsersPage() {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [data, setData] = useState<UserListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (debouncedQ) params.set('q', debouncedQ);
      const res = await api<UserListResponse>(`/api/admin/users?${params.toString()}`);
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleBan(u: PublicUserRow) {
    setError(null);
    try {
      await api(`/api/admin/users/${u.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isBanned: !u.isBanned })
      });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Update failed');
    }
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setPage(1);
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  return (
    <div>
      <PageHeader title="Users" subtitle="Registered members who participate in Q&A." />

      <Card className="p-4">
        <form onSubmit={onSearch} className="flex items-center gap-3">
          <Input
            placeholder="Search username or display name…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            className="max-w-xs"
          />
          <span className="ml-auto text-xs text-faint">{data ? `${data.total} user(s)` : ''}</span>
        </form>
      </Card>

      <div className="mt-4">
        {error ? <Banner kind="error" className="mb-4">{error}</Banner> : null}
        {loading && !data ? (
          <div className="flex justify-center py-20">
            <Spinner className="h-7 w-7 text-muted" />
          </div>
        ) : !data ? null : data.items.length === 0 ? (
          <EmptyState>No users found.</EmptyState>
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-faint">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Activity</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((u) => (
                  <tr key={u.id} className="hover:bg-canvas/60">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">@{u.username}</p>
                      {u.displayName || u.pronouns ? (
                        <p className="text-xs text-faint">
                          {[u.displayName, u.pronouns].filter(Boolean).join(' · ') || ''}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {u.counts.questions} questions · {u.counts.answers} answers · {u.counts.comments} comments
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {u.isBanned ? <Badge tone="warn">banned</Badge> : <Badge tone="good">active</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant={u.isBanned ? 'secondary' : 'danger'}
                        className="px-3 py-1.5 text-xs"
                        onClick={() => toggleBan(u)}
                      >
                        {u.isBanned ? 'Unban' : 'Ban'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {data && data.total > pageSize ? (
          <div className="mt-4 flex items-center justify-between">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-xs">
              Previous
            </Button>
            <span className="text-xs text-muted">
              Page {page} of {totalPages}
            </span>
            <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-xs">
              Next
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
