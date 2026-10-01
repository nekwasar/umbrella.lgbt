'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, toApiError, ApiError } from '@/lib/api';
import type { ModerationReport, ModerationItem, ModerationKind } from '@/lib/types';
import {
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Spinner
} from '@/components/admin/ui';
import { timeAgo } from '@/lib/time';

const TABS: Array<{ key: string; label: string }> = [
  { key: 'reports', label: 'Reports' },
  { key: 'questions', label: 'Questions' },
  { key: 'answers', label: 'Answers' },
  { key: 'comments', label: 'Comments' },
  { key: 'forum-topics', label: 'Forum Topics' },
  { key: 'forum-posts', label: 'Forum Posts' }
];

const KIND_BY_TAB: Record<string, ModerationKind> = {
  questions: 'question',
  answers: 'answer',
  comments: 'comment',
  'forum-topics': 'forum-topic',
  'forum-posts': 'forum-post'
};

const STATUS_TONE: Record<string, 'good' | 'warn' | 'neutral'> = {
  PUBLISHED: 'good',
  PENDING: 'warn',
  REMOVED: 'neutral'
};

export function ModerationManager() {
  const [tab, setTab] = useState('reports');
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [reportFilter, setReportFilter] = useState('PENDING');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'reports') {
        const res = await api<{ items: ModerationReport[] }>(
          `/api/admin/moderation/reports?status=${reportFilter}`
        );
        setReports(res.items);
      } else {
        const res = await api<{ items: ModerationItem[] }>(
          `/api/admin/moderation/qa?type=${tab}`
        );
        setItems(res.items);
      }
    } catch (err) {
      setError(toApiError(err, 'GET', '/api/admin/moderation'));
    } finally {
      setLoading(false);
    }
  }, [tab, reportFilter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function removeContent(kind: ModerationKind, id: string, label: string) {
    if (!window.confirm(`Remove this ${label.replace('-', ' ')}? It will be hidden from the site.`)) {
      return;
    }
    setBusyId(id);
    setNotice(null);
    try {
      await api('/api/admin/moderation/remove', { method: 'POST', body: JSON.stringify({ kind, id }) });
      setNotice(`Removed. The content is now hidden.`);
      await refresh();
    } catch (err) {
      setError(toApiError(err, 'POST', '/api/admin/moderation/remove'));
    } finally {
      setBusyId(null);
    }
  }

  async function setReportStatus(id: string, status: 'PUBLISHED' | 'REMOVED', label: string) {
    setBusyId(id);
    setNotice(null);
    try {
      await api(`/api/admin/moderation/reports/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      setNotice(`Report ${label}.`);
      await refresh();
    } catch (err) {
      setError(toApiError(err, 'PATCH', `/api/admin/moderation/reports/${id}`));
    } finally {
      setBusyId(null);
    }
  }

  function switchTab(key: string) {
    setTab(key);
    setNotice(null);
    setError(null);
  }

  return (
    <div>
      <PageHeader
        title="Moderation"
        subtitle="Reactive tools only — nothing is queued, everything auto-publishes. Remove what breaks the rules."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              tab === t.key
                ? 'border-brand bg-brand-soft text-brand'
                : 'border-line bg-surface text-muted hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {notice ? (
        <Banner kind="success" className="mb-4">
          {notice}
        </Banner>
      ) : null}
      {error ? (
        <Banner kind="error" className="mb-4">
          <p className="font-semibold">{error.summary}</p>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-[11px] opacity-80">
            {error.detail}
          </pre>
        </Banner>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-7 w-7 text-muted" />
        </div>
      ) : tab === 'reports' ? (
        <>
          <div className="mb-3 flex gap-2">
            {['PENDING', 'PUBLISHED', 'REMOVED', 'all'].map((s) => (
              <button
                key={s}
                onClick={() => setReportFilter(s)}
                className={`rounded-lg border px-3 py-1 text-xs font-semibold transition ${
                  reportFilter === s
                    ? 'border-brand bg-brand-soft text-brand'
                    : 'border-line bg-surface text-muted hover:text-ink'
                }`}
              >
                {s === 'PENDING' ? 'Open' : s === 'PUBLISHED' ? 'Resolved' : s === 'REMOVED' ? 'Dismissed' : 'All'}
              </button>
            ))}
          </div>
          {reports.length === 0 ? (
            <EmptyState>No reports in this view. All quiet.</EmptyState>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <Card key={r.id} className="p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge tone={STATUS_TONE[r.status] ?? 'neutral'}>{r.status}</Badge>
                    <Badge tone="brand">{r.targetType}</Badge>
                    <span className="text-xs text-faint">
                      by @{r.reporter.username} · {timeAgo(r.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-ink">
                    <span className="font-semibold">Reason:</span> {r.reason}
                  </p>
                  <div className="mt-2 rounded-lg border border-line bg-canvas px-3 py-2 text-xs text-muted">
                    {r.targetExists ? (
                      <>
                        <span className="font-semibold text-ink">{r.contentAuthor ?? 'unknown'}:</span>{' '}
                        {r.contentPreview ?? '(no preview)'}
                      </>
                    ) : (
                      <em>Target no longer exists (already removed).</em>
                    )}
                  </div>
                  {r.targetExists && (KIND_BY_TAB[tabKeyForTarget(r.targetType)] ?? null) ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant="danger"
                        loading={busyId === r.id}
                        onClick={() =>
                          removeContent(
                            KIND_BY_TAB[tabKeyForTarget(r.targetType)]!,
                            r.targetId,
                            r.targetType
                          )
                        }
                      >
                        Remove content
                      </Button>
                      <Button variant="secondary" onClick={() => setReportStatus(r.id, 'REMOVED', 'dismissed')}>
                        Dismiss report
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-3 flex gap-2">
                      <Button variant="secondary" onClick={() => setReportStatus(r.id, 'PUBLISHED', 'resolved')}>
                        Mark resolved
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      ) : items.length === 0 ? (
        <EmptyState>Nothing here yet.</EmptyState>
      ) : (
        <Card className="p-0">
          {items.map((it) => (
            <div key={it.id} className="flex flex-wrap items-start gap-3 border-b border-line px-4 py-3 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{it.title}</p>
                <p className="mt-0.5 truncate text-xs text-muted">{it.preview}</p>
                <p className="mt-1 text-xs text-faint">
                  {it.author ? `@${it.author} · ` : ''}
                  {timeAgo(it.createdAt)} · {it.meta}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={STATUS_TONE[it.status] ?? 'neutral'}>{it.status}</Badge>
                {it.status !== 'REMOVED' ? (
                  <Button
                    variant="danger"
                    loading={busyId === it.id}
                    onClick={() => removeContent(KIND_BY_TAB[tab]!, it.id, tab.replace('-', ' '))}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function tabKeyForTarget(targetType: string): string {
  switch (targetType) {
    case 'QUESTION':
      return 'questions';
    case 'ANSWER':
      return 'answers';
    case 'COMMENT':
      return 'comments';
    case 'FORUM_TOPIC':
      return 'forum-topics';
    case 'FORUM_POST':
      return 'forum-posts';
    default:
      return '';
  }
}
