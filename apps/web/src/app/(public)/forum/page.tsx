import type { Metadata } from 'next';
import Link from 'next/link';
import { apiFetch } from '@/lib/data';
import { timeAgo } from '@/lib/time';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';
import type { ForumIndexResponse } from '@/lib/types';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Community Forum | Umbrella.lgbt',
  description:
    'Talk with the community: introductions, support, identity, pride, and more. Public, friendly, and moderated with care.',
  alternates: { canonical: 'https://umbrella.lgbt/forum' }
};

export default async function ForumIndex({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
  const data = await apiFetch<ForumIndexResponse>(`/api/forum${query}`);
  const categories = data?.categories ?? [];

  return (
    <div>
      <Breadcrumbs parts={[{ name: 'Forum' }]} />
      <h1 style={{ marginBottom: 6 }}>Community Forum</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Board index — pick a board, read along, or start a topic. You need an account to post.
      </p>

      <form action="/forum" method="get" style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search Forums"
          className="input"
          style={{ maxWidth: 320 }}
        />
        <button type="submit" className="btn btn-solid">
          Search
        </button>
      </form>

      {categories.length === 0 ? (
        <div className="card-flat">
          <p className="muted" style={{ margin: 0, fontStyle: 'italic' }}>
            {q ? `No boards match "${q}".` : 'No boards yet. Check back soon.'}
          </p>
        </div>
      ) : (
        categories.map((cat) => (
          <section key={cat.name} className="sidebox" style={{ marginBottom: 14 }}>
            <div className="sidebox-hd">{cat.name}</div>
            <div className="row-list" style={{ border: 'none' }}>
              {cat.boards.map((b) => (
                <div key={b.slug} className="forum-board-row">
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span className="avatar" aria-hidden="true">
                      {(b.name.trim()[0] || '?').toUpperCase()}
                    </span>
                    <div>
                      <Link className="forum-board-name" href={`/forum/board/${b.slug}`}>
                        {b.name}
                      </Link>
                      <div className="forum-board-desc muted">{b.description}</div>
                    </div>
                  </div>
                  <div className="forum-counts meta">
                    <span className="tag">{b.topicCount} topics</span>
                    <span className="tag">{b.postCount} posts</span>
                  </div>
                  <div className="forum-meta">
                    {b.lastPost ? (
                      <>
                        Last post by <strong>{b.lastPost.authorName}</strong>
                        <br />
                        {timeAgo(b.lastPost.createdAt)} in{' '}
                        <Link href={`/forum/topic/${b.lastPost.topicId}`}>{b.lastPost.topicTitle}</Link>
                      </>
                    ) : (
                      'No posts yet'
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
