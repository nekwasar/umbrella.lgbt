import type { Metadata } from 'next';
import Link from 'next/link';
import { apiFetch } from '@/lib/data';
import { timeAgo } from '@/lib/time';
import { mdToText } from '@/lib/sanitize';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';
import { absUrl } from '@/lib/seo';
import type { BulletinListResponse } from '@/lib/types';

export const revalidate = 120;

export const metadata: Metadata = {
  title: 'Bulletin | Umbrella.lgbt',
  description:
    'Site bulletins — announcements, feature launches, and news from the Umbrella team. MySpace-style, posted to everyone at once.',
  alternates: { canonical: absUrl('/bulletin') }
};

export default async function BulletinIndex({
  searchParams
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || '1', 10) || 1);
  const data = await apiFetch<BulletinListResponse>(`/api/bulletins?page=${page}&pageSize=20`, 300, [
    'bulletins'
  ]);
  const { items = [], total = 0, pageSize = 20 } = data ?? {};
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <Breadcrumbs parts={[{ name: 'Bulletin' }]} />
      <h1 style={{ marginBottom: 4 }}>Bulletin</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Messages from and to everyone at once — announcements, launches, and site news. You can
        comment on any bulletin.
      </p>

      <div className="row-list" style={{ marginTop: 12 }}>
        {items.length === 0 ? (
          <div className="muted" style={{ fontStyle: 'italic' }}>
            No bulletins yet. Check back soon.
          </div>
        ) : (
          items.map((b) => (
            <Link key={b.id} href={`/bulletin/${b.id}`}>
              <span style={{ fontWeight: 700 }}>
                {b.pinned ? '📌 ' : ''}
                {b.title}
              </span>
              <span className="meta" style={{ display: 'block' }}>
                <span className="tag tag-brown">{timeAgo(b.createdAt)}</span>
                {b.commentCount ? <span className="tag">{b.commentCount} comments</span> : null}
                {mdToText(b.bodyMd, 110) ? ` — ${mdToText(b.bodyMd, 110)}` : ''}
              </span>
            </Link>
          ))
        )}
      </div>

      {page > 1 || items.length === pageSize ? (
        <div className="forum-tabs">
          {page > 1 ? (
            <Link className="btn" href={`/bulletin?page=${page - 1}`}>
              ← Newer
            </Link>
          ) : null}
          <span className="meta">
            Page {page}
          </span>
          {items.length === pageSize ? (
            <Link className="btn" href={`/bulletin?page=${page + 1}`}>
              Older →
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
