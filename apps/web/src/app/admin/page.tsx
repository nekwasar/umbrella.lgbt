'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/admin-api';
import { StatsResponse } from '@/lib/types';
import { Badge, Card, EmptyState, PageHeader, Spinner } from '@/components/admin/ui';

const TYPE_LABEL: Record<string, string> = {
  CORE: 'Core',
  BLOG: 'Blog',
  QA: 'Q&A',
  GLOSSARY: 'Glossary',
  CITY: 'City Guides',
  RESOURCES: 'Resources'
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<StatsResponse>('/api/admin/stats')
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
    { label: 'Total pages', value: stats.pages.total, sub: `${stats.pages.published} published · ${stats.pages.drafts} drafts` },
    { label: 'Q&A questions', value: stats.questions, sub: 'dynamic content' },
    { label: 'Answers', value: stats.answers, sub: `${stats.comments} comments` },
    { label: 'Members', value: stats.users, sub: `${stats.reports} open reports` }
  ];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of your Umbrella.lgbt content." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-faint">{c.label}</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-ink">{c.value}</p>
            <p className="mt-1 text-xs text-muted">{c.sub}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
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
      </div>
    </div>
  );
}
