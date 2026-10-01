'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/admin-api';
import { AdminStatsResponse } from '@/lib/types';
import { Badge, Card, EmptyState, PageHeader, Spinner } from '@/components/admin/ui';
import { timeAgo } from '@/lib/time';

const TYPE_LABEL: Record<string, string> = {
  CORE: 'Core',
  BLOG: 'Blog',
  QA: 'Q&A',
  GLOSSARY: 'Glossary',
  CITY: 'City Guides',
  RESOURCES: 'Resources'
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<AdminStatsResponse>('/api/admin/stats')
      .then(setStats)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <EmptyState>{error}</EmptyState>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-8 w-8 text-muted" />
      </div>
    );
  }

  const byType = Object.fromEntries(stats.pages.byType.map((t) => [t.type, t._count]));

  const cards = [
    { label: 'Pages', value: stats.pages.total, sub: `${stats.pages.published} published · ${stats.pages.drafts} drafts` },
    { label: 'Q&A', value: stats.questions, sub: `${stats.answers} answers · ${stats.comments} comments` },
    { label: 'Members', value: stats.users, sub: 'registered community' },
    { label: 'Open reports', value: stats.pendingReports, sub: `${stats.reports} reports total` },
    { label: 'Forum', value: stats.forum.topics, sub: `${stats.forum.posts} posts in ${stats.forum.boards} boards` },
    { label: 'Bulletins', value: stats.bulletins, sub: 'live announcements' }
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Everything under the umbrella, at a glance."
        actions={
          <>
            <Link href="/admin/pages/new" className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-canvas hover:bg-black">
              + New Page
            </Link>
            <Link href="/admin/bulletins" className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-xs font-semibold text-ink hover:border-brand hover:text-brand">
              + Bulletin
            </Link>
            <Link href="/admin/moderation" className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-xs font-semibold text-ink hover:border-brand hover:text-brand">
              Moderation{stats.pendingReports > 0 ? ` (${stats.pendingReports})` : ''}
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-faint">{c.label}</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-ink">{c.value}</p>
            <p className="mt-1 text-xs text-muted">{c.sub}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">Pages by type</h2>
          <div className="space-y-2">
            {Object.entries(TYPE_LABEL).map(([type, label]) => (
              <div key={type} className="flex items-center justify-between text-sm">
                <Link href={`/admin/pages?type=${type}`} className="font-medium text-ink hover:text-brand">
                  {label}
                </Link>
                <span className="font-semibold text-muted">{byType[type] ?? 0}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-line pt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Content total</span>
              <span className="font-bold text-ink">{stats.pages.total}</span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Recently updated</h2>
            <Link href="/admin/pages" className="text-xs font-semibold text-brand hover:underline">
              View all
            </Link>
          </div>
          {stats.recentPages.length === 0 ? (
            <EmptyState>No pages yet.</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {stats.recentPages.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/admin/pages/${p.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-brand"
                  >
                    <span className="truncate font-medium text-ink">{p.title}</span>
                    <Badge tone={p.status === 'PUBLISHED' ? 'good' : 'neutral'}>{TYPE_LABEL[p.type]}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Latest questions</h2>
            <Link href="/admin/moderation" className="text-xs font-semibold text-brand hover:underline">
              Moderate
            </Link>
          </div>
          {stats.recentQuestions.length === 0 ? (
            <EmptyState>No questions yet.</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {stats.recentQuestions.map((q) => (
                <li key={q.id}>
                  <a
                    href={`/qa/${q.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block py-2.5 text-sm hover:text-brand"
                  >
                    <span className="block truncate font-medium text-ink">{q.title}</span>
                    <span className="text-xs text-faint">
                      @{q.author} · {q.answerCount} answers · {timeAgo(q.createdAt)}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Bulletins</h2>
          <Link href="/admin/bulletins" className="text-xs font-semibold text-brand hover:underline">
            Manage
          </Link>
        </div>
        {stats.recentBulletins.length === 0 ? (
          <EmptyState>No bulletins yet.</EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {stats.recentBulletins.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="truncate font-medium text-ink">
                  {b.pinned ? '📌 ' : ''}
                  {b.title}
                </span>
                <span className="flex items-center gap-2">
                  <Badge tone={b.status === 'PUBLISHED' ? 'good' : 'warn'}>{b.status === 'PUBLISHED' ? 'Live' : 'Hidden'}</Badge>
                  <span className="text-xs text-faint">{timeAgo(b.createdAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
