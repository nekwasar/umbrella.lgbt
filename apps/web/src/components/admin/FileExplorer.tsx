'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, toApiError, ApiError } from '@/lib/api';
import { PageListResponse } from '@/lib/types';
import {
  Badge,
  Banner,
  Card,
  EmptyState,
  PageHeader,
  Spinner
} from '@/components/admin/ui';
import { timeAgo } from '@/lib/time';

export const FOLDERS = [
  { type: 'CORE', label: 'core', desc: 'Core pages (about, features, privacy…)' },
  { type: 'BLOG', label: 'blog', desc: 'Blog posts' },
  { type: 'QA', label: 'qa', desc: 'Static Q&A answers' },
  { type: 'GLOSSARY', label: 'glossary', desc: 'Glossary terms' },
  { type: 'CITY', label: 'city', desc: 'Queer city guides' },
  { type: 'RESOURCES', label: 'resources', desc: 'Country resource directories' }
];

export function FileManagerRoot() {
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    Promise.all(
      FOLDERS.map((f) =>
        api<PageListResponse>(`/api/admin/pages?type=${f.type}&pageSize=1`)
          .then((r) => [f.type, r.total] as const)
          .catch(() => [f.type, 0] as const)
      )
    )
      .then((pairs) => setCounts(Object.fromEntries(pairs)))
      .catch((err) => setError(toApiError(err, 'GET', '/api/admin/pages')));
  }, []);

  return (
    <div>
      <PageHeader title="Files" subtitle="Every seeded page, as files. Open a folder, open a file, edit and save." />
      {error ? (
        <Banner kind="error" className="mb-4">
          {error.summary}
        </Banner>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FOLDERS.map((f) => (
          <Link key={f.type} href={`/admin/files/${f.type}`}>
            <Card className="flex items-center gap-4 p-5 transition hover:border-brand">
              <span className="text-3xl" aria-hidden="true">
                📁
              </span>
              <div className="min-w-0">
                <p className="font-mono text-sm font-bold text-ink">{f.label}/</p>
                <p className="truncate text-xs text-muted">{f.desc}</p>
                <p className="mt-1 text-xs font-semibold text-faint">
                  {counts ? `${counts[f.type] ?? 0} files` : '…'}
                </p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function FileFolder() {
  const params = useParams<{ type: string }>();
  const folder = FOLDERS.find((f) => f.type === params.type?.toUpperCase());
  const [data, setData] = useState<PageListResponse | null>(null);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const refresh = useCallback(async () => {
    if (!folder) return;
    try {
      const res = await api<PageListResponse>(
        `/api/admin/pages?type=${folder.type}&pageSize=100${q ? `&q=${encodeURIComponent(q)}` : ''}`
      );
      setData(res);
      setError(null);
    } catch (err) {
      setError(toApiError(err, 'GET', '/api/admin/pages'));
    } finally {
      setLoading(false);
    }
  }, [folder, q]);

  useEffect(() => {
    const t = setTimeout(refresh, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [refresh, q]);

  if (!folder) {
    return (
      <div>
        <PageHeader title="Files" />
        <EmptyState>Unknown folder. Back to <Link href="/admin/files">file manager</Link>.</EmptyState>
      </div>
    );
  }

  const items = data?.items ?? [];

  return (
    <div>
      <PageHeader
        title={`${folder.label}/`}
        subtitle={`${data?.total ?? 0} files · click a file to open the editor`}
        actions={
          <Link href="/admin/files" className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-xs font-semibold text-ink hover:border-brand hover:text-brand">
            ← All folders
          </Link>
        }
      />

      <input
        className="mb-3 w-full max-w-sm rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
        placeholder={`Search ${folder.label}/…`}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {error ? (
        <Banner kind="error" className="mb-4">
          {error.summary}
        </Banner>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-7 w-7 text-muted" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState>No files match.</EmptyState>
      ) : (
        <Card className="p-0">
          {items.map((p) => (
            <Link
              key={p.id}
              href={`/admin/files/${folder.type.toLowerCase()}/${p.slug}`}
              className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2.5 last:border-0 hover:bg-line/30"
            >
              <span aria-hidden="true">📄</span>
              <span className="font-mono text-sm font-semibold text-ink">{p.slug}.md</span>
              <span className="min-w-0 flex-1 truncate text-xs text-muted">{p.title}</span>
              <Badge tone={p.seeded ? 'good' : 'neutral'}>{p.seeded ? 'seeded' : 'empty'}</Badge>
              <Badge tone={p.status === 'PUBLISHED' ? 'good' : 'warn'}>{p.status}</Badge>
              <span className="text-xs text-faint">{timeAgo(p.updatedAt)}</span>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
