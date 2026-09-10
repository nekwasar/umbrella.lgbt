import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/data';
import { timeAgo } from '@/lib/time';
import { mdToHtml, mdToText } from '@/lib/sanitize';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';
import { absUrl } from '@/lib/seo';
import type { ForumTopicResponse } from '@/lib/types';
import { PostActions } from './post-actions';
import { QuickReply } from './quick-reply';

export const revalidate = 300;

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await apiFetch<ForumTopicResponse>(`/api/forum/topic/${id}?pageSize=1`);
  if (!data) return { title: 'Forum | Umbrella.lgbt' };
  return {
    title: `${data.topic.title} | Forum | Umbrella.lgbt`,
    description: mdToText(data.items[0]?.bodyMd ?? '', 160),
    alternates: { canonical: absUrl(`/forum/topic/${id}`) }
  };
}

function joinedDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
}

export default async function ForumTopicPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || '1', 10) || 1);
  const data = await apiFetch<ForumTopicResponse>(`/api/forum/topic/${id}?page=${page}&pageSize=50`);
  if (!data) notFound();
  const { topic, items, total, pageSize } = data;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <Breadcrumbs
        parts={[
          { name: 'Forum', url: absUrl('/forum') },
          { name: topic.boardName ?? 'Board', url: topic.boardSlug ? absUrl(`/forum/board/${topic.boardSlug}`) : undefined },
          { name: topic.title }
        ]}
      />
      <h1 style={{ marginBottom: 4 }}>{topic.title}</h1>
      <p className="meta" style={{ marginTop: 0 }}>
        {topic.viewCount} view{topic.viewCount === 1 ? '' : 's'} · {topic.postCount} post
        {topic.postCount === 1 ? '' : 's'} · started by {topic.authorName ?? 'Unknown'}{' '}
        {timeAgo(topic.createdAt)}
        {topic.locked ? (
          <>
            {' '}· <span className="tag">Locked</span>
          </>
        ) : null}
      </p>

      <div>
        {items.map((p) => (
          <article key={p.id} className="forum-post">
            <div className="forum-post-head">
              <span className="avatar" aria-hidden="true">
                {((p.author?.displayName || p.author?.username || '?').trim()[0] || '?').toUpperCase()}
              </span>
              <span className="comment-name">{p.author?.displayName || p.author?.username || 'Unknown'}</span>
              <span className="tag">Member</span>
              <span>
                joined {p.author ? joinedDate(p.author.createdAt) : '—'} ·{' '}
                {p.author ? `${p.author.postCount} posts` : ''}
              </span>
              <span style={{ marginLeft: 'auto' }}>{timeAgo(p.createdAt)}</span>
            </div>
            <div
              className="forum-post-body md-preview"
              dangerouslySetInnerHTML={{ __html: mdToHtml(p.bodyMd) }}
            />
            <div className="forum-post-actions">
              <PostActions
                topicId={topic.id}
                postId={p.id}
                author={p.author?.displayName || p.author?.username || 'Unknown'}
                bodyMd={p.bodyMd}
              />
            </div>
          </article>
        ))}
      </div>

      {pages > 1 ? (
        <div className="forum-tabs">
          {page > 1 ? (
            <Link className="btn" href={`/forum/topic/${topic.id}?page=${page - 1}`}>
              ← Newer
            </Link>
          ) : null}
          <span className="meta">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link className="btn" href={`/forum/topic/${topic.id}?page=${page + 1}`}>
              Older →
            </Link>
          ) : null}
        </div>
      ) : null}

      {topic.locked ? (
        <div className="alert alert-error" style={{ marginTop: 12 }}>
          This topic is locked. No new replies.
        </div>
      ) : (
        <QuickReply topicId={topic.id} />
      )}
    </div>
  );
}
