'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/admin-api';
import { Page, PageListResponse, PageStatus, PageType } from '@/lib/types';
import {
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Select,
  Spinner
} from '@/components/admin/ui';

const TYPES: (PageType | '')[] = ['', 'CORE', 'BLOG', 'QA', 'GLOSSARY', 'CITY', 'RESOURCES'];
const STATUS: (PageStatus | '')[] = ['', 'PUBLISHED', 'DRAFT'];

const TYPE_LABEL: Record<string, string> = {
  CORE: 'Core',
  BLOG: 'Blog',
  QA: 'Q&A',
  GLOSSARY: 'Glossary',
  CITY: 'City',
  RESOURCES: 'Resources'
};

export function PagesManager({
  initialType,
  initialStatus
}: {
  initialType?: string;
  initialStatus?: string;
}) {
  const router = useRouter();
  const [type, setType] = useState<PageType | ''>((initialType as PageType) || '');
  const [status, setStatus] = useState<PageStatus | ''>((initialStatus as PageStatus) || '');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [data, setData] = useState<PageListResponse | null>(null);
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
      if (type) params.set('type', type);
      if (status) params.set('status', status);
      if (debouncedQ) params.set('q', debouncedQ);
      const res = await api<PageListResponse>(`/api/admin/pages?${params.toString()}`);
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load pages');
    } finally {
      setLoading(false);
    }
  }, [type, status, debouncedQ, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const resetPage = () => setPage(1);

  async function onDelete(p: Page) {
    if (!window.confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    try {
      await api(`/api/admin/pages/${p.id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Delete failed');
    }
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setPage(1);
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  return (
    <div>
      <PageHeader
        title="Pages"
        subtitle="Manage every page across the site."
        actions={
          <Link href="/admin/pages/new">
            <Button>+ New page</Button>
          </Link>
        }
      />

      <Card className="p-4">
        <form onSubmit={onSearch} className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search title or slug…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              resetPage();
            }}
            className="max-w-xs"
          />
          <Select value={type} onChange={(e) => { setType(e.target.value as PageType | ''); resetPage(); }} className="w-36">
            {TYPES.map((t) => (
              <option key={t || 'all'} value={t}>
                {t ? TYPE_LABEL[t] : 'All types'}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => { setStatus(e.target.value as PageStatus | ''); resetPage(); }} className="w-36">
            {STATUS.map((s) => (
              <option key={s || 'all'} value={s}>
                {s ? s[0] + s.slice(1).toLowerCase() : 'All statuses'}
              </option>
            ))}
          </Select>
          <span className="ml-auto text-xs text-faint">{data ? `${data.total} result(s)` : ''}</span>
        </form>
      </Card>

      <div className="mt-4">
        {error ? (
          <Banner kind="error">{error}</Banner>
        ) : loading && !data ? (
          <div className="flex justify-center py-20">
            <Spinner className="h-7 w-7 text-muted" />
          </div>
        ) : !data ? null : data.items.length === 0 ? (
          <EmptyState>No pages match your filters.</EmptyState>
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-faint">
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((p) => (
                  <tr key={p.id} className="hover:bg-canvas/60">
                    <td className="px-4 py-3">
                      <Link href={`/admin/pages/${p.id}`} className="font-semibold text-ink hover:text-brand">
                        {p.title}
                      </Link>
                      <span className="block text-xs text-faint">
                        Updated {new Date(p.updatedAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={p.type === 'QA' || p.type === 'BLOG' ? 'brand' : 'neutral'}>
                        {TYPE_LABEL[p.type]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">/{p.url}</td>
                    <td className="px-4 py-3">
                      <Badge tone={p.status === 'PUBLISHED' ? 'good' : 'warn'}>{p.status.toLowerCase()}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/pages/${p.id}`}>
                          <Button variant="secondary" className="px-3 py-1.5 text-xs">
                            Edit
                          </Button>
                        </Link>
                        <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => onDelete(p)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {data && data.total > pageSize ? (
          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 text-xs"
            >
              Previous
            </Button>
            <span className="text-xs text-muted">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 text-xs"
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
