import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiFetch } from '@/lib/data';
import { timeAgo } from '@/lib/time';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';
import { absUrl } from '@/lib/seo';
import type { ForumBoardResponse } from '@/lib/types';
import { NewTopicForm } from './new-topic-form';

export const revalidate = 300;

type Params = { slug: string; sort?: string; page?: string };

export async function generateMetadata({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await apiFetch<ForumBoardResponse>(`/api/forum/board/${slug}?pageSize=1`);
  if (!data) return { title: 'Forum | Umbrella.lgbt' };
  return {
    title: `${data.board.name} | Forum | Umbrella.lgbt`,
    description: data.board.description || `Talk about ${data.board.name} with the community.`,
    alternates: { canonical: absUrl(`/forum/board/${slug}`) }
  };
}

export default async function ForumBoardPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; page?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const sort = sp.sort === 'top' ? 'top' : 'recent';
  const page = Math.max(1, parseInt(sp.page || '1', 10) || 1);
  const data = await apiFetch<ForumBoardResponse>(
    `/api/forum/board/${slug}?sort=${sort}&page=${page}&pageSize=20`
  );
  if (!data) notFound();
  const { board, items, total, pageSize } = data;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <Breadcrumbs
        parts={[{ name: 'Forum', url: absUrl('/forum') }, { name: board.name }]}
      />
      <h1 style={{ marginBottom: 4 }}>{board.name}</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        {board.description} · {total} topic{total === 1 ? '' : 's'}
      </p>

      <NewTopicForm boardSlug={board.slug} />

      <div className="forum-tabs" role="tablist" aria-label="Topic sort">
        <Link
          href={`/forum/board/${board.slug}?sort=recent`}
          className={`tag ${sort === 'recent' ? 'tag-brown' : ''}`}
        >
          Recent Topics
        </Link>
        <Link
          href={`/forum/board/${board.slug}?sort=top`}
          className={`tag ${sort === 'top' ? 'tag-brown' : ''}`}
        >
          Top Topics
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="card-flat">
          <p className="muted" style={{ margin: 0, fontStyle: 'italic' }}>
            No topics yet. Start the first one above.
          </p>
        </div>
      ) : (
        <div className="row-list">
          {items.map((t) => (
            <div key={t.id} className="forum-topic-row">
              <div>
                <Link className="forum-topic-title" href={`/forum/topic/${t.id}`}>
                  {t.pinned ? '📌 ' : ''}
                  {t.title}
                </Link>{' '}
                {t.pinned ? <span className="tag tag-blue">Pinned</span> : null}
                {t.locked ? <span className="tag">Locked</span> : null}
                <span className="meta" style={{ display: 'block' }}>
                  by {t.authorName ?? 'Unknown'} · {timeAgo(t.createdAt)}
                  {t.lastPost ? ` · last reply ${timeAgo(t.lastPost.createdAt)}` : ''}
                </span>
              </div>
              <span className="meta">
                {t.viewCount} view{t.viewCount === 1 ? '' : 's'}
              </span>
              <span className="tag tag-brown forum-reply-badge">
                {t.replyCount} {t.replyCount === 1 ? 'reply' : 'replies'}
              </span>
            </div>
          ))}
        </div>
      )}

      {pages > 1 ? (
        <div className="forum-tabs">
          {page > 1 ? (
            <Link className="btn" href={`/forum/board/${board.slug}?sort=${sort}&page=${page - 1}`}>
              ← Newer
            </Link>
          ) : null}
          <span className="meta">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link className="btn" href={`/forum/board/${board.slug}?sort=${sort}&page=${page + 1}`}>
              Older →
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
