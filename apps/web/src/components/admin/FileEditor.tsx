'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, toApiError, ApiError } from '@/lib/api';
import { Page, PageListResponse } from '@/lib/types';
import { mdToHtml } from '@/lib/sanitize';
import { timeAgo } from '@/lib/time';
import { Badge, Banner, Button, Card, PageHeader, Spinner } from '@/components/admin/ui';
import { FOLDERS } from '@/components/admin/FileExplorer';

const AUTOSAVE_MS = 1500;

export function FileEditor() {
  const params = useParams<{ type: string; slug: string }>();
  const folder = FOLDERS.find((f) => f.type === params.type?.toUpperCase());
  const slug = params.slug ?? '';

  const [page, setPage] = useState<Page | null>(null);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ApiError | null>(null);

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<ApiError | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const latest = useRef(content);
  latest.current = content;

  const load = useCallback(async () => {
    if (!folder) return;
    try {
      const res = await api<PageListResponse>(`/api/admin/pages?type=${folder.type}&pageSize=100`);
      const hit = res.items.find((p) => p.slug === slug) ?? null;
      if (!hit) {
        setLoadError(toApiError(new Error('File not found in this folder'), 'GET', '/api/admin/pages'));
        setLoading(false);
        return;
      }
      setPage(hit);
      setContent(hit.contentMd ?? '');
      setSavedAt(hit.updatedAt);
      setDirty(false);
      setLoadError(null);
    } catch (err) {
      setLoadError(toApiError(err, 'GET', '/api/admin/pages'));
    } finally {
      setLoading(false);
    }
  }, [folder, slug]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (silent = true) => {
      if (!page) return;
      setSaving(true);
      setSaveError(null);
      try {
        const res = await api<{ ok: boolean; updatedAt: string }>(`/api/admin/pages/${page.id}/content`, {
          method: 'PATCH',
          body: JSON.stringify({ contentMd: latest.current })
        });
        setSavedAt(res.updatedAt);
        setDirty(false);
        setSaving(false);
        return true;
      } catch (err) {
        setSaveError(toApiError(err, 'PATCH', `/api/admin/pages/${page.id}/content`));
        setSaving(false);
        return false;
      }
    },
    [page]
  );

  // autosave: debounce after every edit
  useEffect(() => {
    if (!dirty || !page) return;
    const t = setTimeout(() => save(true), AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [content, dirty, page, save]);

  // reload guard while dirty
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  if (!folder) {
    return (
      <div>
        <PageHeader title="Files" />
        <Banner kind="error">
          Unknown folder. Back to <Link href="/admin/files">file manager</Link>.
        </Banner>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-8 w-8 text-muted" />
      </div>
    );
  }

  if (loadError || !page) {
    return (
      <div>
        <PageHeader title={`Not found`} />
        <Banner kind="error">
          {loadError?.summary ?? 'File not found.'} —{' '}
          <Link href={`/admin/files/${folder.type.toLowerCase()}`}>back to {folder.label}/</Link>
        </Banner>
      </div>
    );
  }

  const statusLabel = saving
    ? 'Saving…'
    : saveError
      ? 'Save failed'
      : dirty
        ? 'Unsaved changes'
        : savedAt
          ? `Saved ${timeAgo(savedAt)}`
          : '';

  return (
    <div>
      <PageHeader
        title={`${page.slug}.md`}
        subtitle={`${page.title} · ${folder.label}/`}
        actions={
          <>
            <span className="mr-1 text-xs font-semibold text-muted" role="status" aria-live="polite">
              {statusLabel}
            </span>
            <button
              onClick={() => setShowPreview((v) => !v)}
              className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-xs font-semibold text-ink hover:border-brand hover:text-brand"
            >
              {showPreview ? 'Hide preview' : 'Preview'}
            </button>
            <Button variant={dirty || saving ? 'primary' : 'secondary'} loading={saving} onClick={() => save(false)}>
              Save
            </Button>
            <Link
              href={`/admin/files/${folder.type.toLowerCase()}`}
              className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-xs font-semibold text-ink hover:border-brand hover:text-brand"
            >
              ← {folder.label}/
            </Link>
          </>
        }
      />

      {saveError ? (
        <Banner kind="error" className="mb-4">
          <p className="font-semibold">{saveError.summary}</p>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-[11px] opacity-80">
            {saveError.detail}
          </pre>
        </Banner>
      ) : null}

      <div className={`grid gap-4 ${showPreview ? 'lg:grid-cols-2' : ''}`}>
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-line px-4 py-2">
            <span className="font-mono text-xs font-bold text-muted">content.md</span>
            <Badge tone={page.seeded ? 'good' : 'neutral'}>{page.seeded ? 'seeded' : 'not seeded'}</Badge>
          </div>
          <textarea
            className="h-[60vh] w-full resize-y bg-surface p-4 font-mono text-sm text-ink outline-none"
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setDirty(true);
            }}
            spellCheck={false}
            placeholder="Write markdown here…"
          />
        </Card>

        {showPreview ? (
          <Card className="p-0">
            <div className="border-b border-line px-4 py-2">
              <span className="font-mono text-xs font-bold text-muted">live preview</span>
            </div>
            <div
              className="h-[60vh] overflow-y-auto p-4 text-sm text-ink"
              dangerouslySetInnerHTML={{ __html: mdToHtml(content) }}
            />
          </Card>
        ) : null}
      </div>
    </div>
  );
}
