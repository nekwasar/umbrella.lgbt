'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/admin-api';
import { Page, PageListResponse, PageType } from '@/lib/types';
import {
  Banner,
  Button,
  Card,
  Checkbox,
  EmptyState,
  Input,
  PageHeader,
  Select,
  Spinner
} from '@/components/admin/ui';

const TYPES: (PageType | '')[] = ['', 'CORE', 'BLOG', 'QA', 'GLOSSARY', 'CITY', 'RESOURCES'];

type EditableMeta = {
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  robots: string;
  canonicalUrl: string;
  twitterCard: string;
  noindex: boolean;
  nofollow: boolean;
};

interface EditRow {
  id: string;
  meta: EditableMeta;
}

function toEditable(p: Page): EditableMeta {
  return {
    metaTitle: p.meta?.metaTitle ?? '',
    metaDescription: p.meta?.metaDescription ?? '',
    ogTitle: p.meta?.ogTitle ?? '',
    ogDescription: p.meta?.ogDescription ?? '',
    robots: p.meta?.robots ?? '',
    canonicalUrl: p.meta?.canonicalUrl ?? '',
    twitterCard: p.meta?.twitterCard ?? '',
    noindex: p.meta?.noindex ?? false,
    nofollow: p.meta?.nofollow ?? false
  };
}

const TYPE_LABEL: Record<string, string> = {
  CORE: 'Core',
  BLOG: 'Blog',
  QA: 'Q&A',
  GLOSSARY: 'Glossary',
  CITY: 'City',
  RESOURCES: 'Resources'
};

export function MetaEditor({ initialType }: { initialType?: string }) {
  const [type, setType] = useState<PageType | ''>((initialType as PageType) || '');
  const [pages, setPages] = useState<Page[]>([]);
  const [edits, setEdits] = useState<Record<string, EditableMeta>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all: Page[] = [];
      let page = 1;
      let total = 1;
      do {
        const params = new URLSearchParams({ page: String(page), pageSize: '100' });
        if (type) params.set('type', type);
        const res = await api<PageListResponse>(`/api/admin/pages?${params.toString()}`);
        all.push(...res.items);
        total = res.total;
        page++;
      } while (all.length < total);
      setPages(all);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load pages');
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    load();
  }, [load]);

  function patch(id: string, partial: Partial<EditableMeta>) {
    setEdits((prev) => {
      const current = prev[id] ?? toEditable(pages.find((p) => p.id === id)!);
      return { ...prev, [id]: { ...current, ...partial } };
    });
  }

  function displayMeta(p: Page): EditableMeta {
    return edits[p.id] ?? toEditable(p);
  }

  async function saveAll() {
    const ids = Object.keys(edits);
    if (ids.length === 0) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const items = ids.map((id) => ({
        id,
        meta: {
          ...edits[id],
          metaTitle: edits[id].metaTitle || null,
          metaDescription: edits[id].metaDescription || null,
          ogTitle: edits[id].ogTitle || null,
          ogDescription: edits[id].ogDescription || null,
          robots: edits[id].robots || null,
          canonicalUrl: edits[id].canonicalUrl || null,
          twitterCard: edits[id].twitterCard || null
        }
      }));
      await api('/api/admin/pages/meta/bulk', { method: 'POST', body: JSON.stringify({ items }) });
      setNotice(`Saved meta for ${ids.length} page(s).`);
      setEdits({});
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const dirtyCount = Object.keys(edits).length;

  return (
    <div>
      <PageHeader
        title="Meta editor"
        subtitle="Quickly edit title, description, and social meta for any page — including dynamic pages."
        actions={
          <>
            {dirtyCount > 0 ? (
              <span className="text-xs font-semibold text-warn">{dirtyCount} unsaved</span>
            ) : null}
            <Button onClick={saveAll} loading={saving} disabled={dirtyCount === 0}>
              Save changes
            </Button>
          </>
        }
      />

      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={type}
            onChange={(e) => setType(e.target.value as PageType | '')}
            className="w-44"
          >
            {TYPES.map((t) => (
              <option key={t || 'all'} value={t}>
                {t ? TYPE_LABEL[t] : 'All types'}
              </option>
            ))}
          </Select>
          <span className="ml-auto text-xs text-faint">{pages.length} page(s)</span>
        </div>
      </Card>

      {error ? <Banner kind="error" className="mb-4">{error}</Banner> : null}
      {notice ? <Banner kind="success" className="mb-4">{notice}</Banner> : null}

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-7 w-7 text-muted" />
        </div>
      ) : pages.length === 0 ? (
        <EmptyState>No pages to edit.</EmptyState>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-faint">
                <th className="px-4 py-3">Page</th>
                <th className="px-3 py-3">Meta title</th>
                <th className="px-3 py-3">Meta description</th>
                <th className="px-3 py-3">og:title</th>
                <th className="px-3 py-3">Robots</th>
                <th className="px-3 py-3">Canonical</th>
                <th className="px-3 py-3 text-center">NI</th>
                <th className="px-3 py-3 text-center">NF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {pages.map((p) => {
                const m = displayMeta(p);
                const dirty = !!edits[p.id];
                return (
                  <tr key={p.id} className={dirty ? 'bg-brand-soft/40' : 'hover:bg-canvas/60'}>
                    <td className="px-4 py-2.5 align-top">
                      <Link href={`/admin/pages/${p.id}`} className="font-semibold text-ink hover:text-brand">
                        {p.title}
                      </Link>
                      <span className="block text-[11px] text-faint">
                        {TYPE_LABEL[p.type]} · /{p.slug}
                        {dirty ? ' · edited' : ''}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Input
                        value={m.metaTitle}
                        onChange={(e) => patch(p.id, { metaTitle: e.target.value })}
                        className="min-w-[180px] py-1.5 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <Input
                        value={m.metaDescription}
                        onChange={(e) => patch(p.id, { metaDescription: e.target.value })}
                        className="min-w-[220px] py-1.5 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <Input
                        value={m.ogTitle}
                        onChange={(e) => patch(p.id, { ogTitle: e.target.value })}
                        className="min-w-[160px] py-1.5 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <Input
                        value={m.robots}
                        onChange={(e) => patch(p.id, { robots: e.target.value })}
                        className="min-w-[110px] py-1.5 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <Input
                        value={m.canonicalUrl}
                        onChange={(e) => patch(p.id, { canonicalUrl: e.target.value })}
                        className="min-w-[200px] py-1.5 text-xs font-mono"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <Checkbox checked={m.noindex} onChange={(v) => patch(p.id, { noindex: v })} label="" />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <Checkbox checked={m.nofollow} onChange={(v) => patch(p.id, { nofollow: v })} label="" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
