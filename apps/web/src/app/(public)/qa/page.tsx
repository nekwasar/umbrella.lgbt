import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SERVER_API_URL } from '@/lib/server';
import { mdToText } from '@/lib/sanitize';
import { absUrl, webpageJson } from '@/lib/seo';
import { QuestionListResponse, TopicsResponse } from '@/lib/types';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';

export const dynamic = 'force-dynamic';

const SITE = 'https://umbrella.lgbt';

export const metadata: Metadata = {
  title: 'Q&A | Umbrella.lgbt',
  description:
    'Real answers to the questions queer people ask — coming out, identity, health, relationships, and more. Browse and search the Umbrella.lgbt Q&A.',
  alternates: { canonical: `${SITE}/qa` }
};

const SORTS = [
  { key: 'newest', label: 'Newest' },
  { key: 'popular', label: 'Popular' },
  { key: 'unanswered', label: 'Unanswered' },
  { key: 'views', label: 'Most viewed' }
];

export default async function QAListPage({
  searchParams
}: {
  searchParams: Promise<{ topic?: string; sort?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const topic = params.topic || '';
  const sort = params.sort || 'newest';
  const q = params.q || '';
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1);

  const qs = new URLSearchParams({ page: String(page), pageSize: '20', sort });
  if (topic) qs.set('topic', topic);
  if (q) qs.set('q', q);

  const [listRes, topicsRes] = await Promise.all([
    fetch(`${SERVER_API_URL}/api/qa?${qs.toString()}`, { cache: 'no-store' }),
    fetch(`${SERVER_API_URL}/api/qa/topics`, { cache: 'no-store' })
  ]);

  if (!listRes.ok) notFound();
  const list: QuestionListResponse = await listRes.json();
  const topics: TopicsResponse = topicsRes.ok ? await topicsRes.json() : { topics: [] };

  const totalPages = Math.max(1, Math.ceil(list.total / 20));
  const topicList = topics.topics.slice(0, 20);

  const itemListJson = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Umbrella.lgbt Q&A',
    numberOfItems: list.items.length,
    itemListElement: list.items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE}/qa/${item.slug}`,
      name: item.title
    }))
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJson) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webpageJson('Q&A | Umbrella.lgbt', absUrl('/qa'))) }} />
      <Breadcrumbs parts={[{ name: 'Q&A' }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <h1 style={{ marginBottom: 0 }}>Q&amp;A</h1>
        <Link href="/qa/ask" className="btn btn-solid">
          Ask a question
        </Link>
      </div>
      <p className="muted" style={{ marginTop: 0, fontSize: 12 }}>
        Answers to the questions queer people actually ask — public, permanent, and indexed.
      </p>

      {/* topic chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        <TopicTag active={topic === ''} href={hrefFor({ topic: '', q, sort, page: 1 })}>
          All
        </TopicTag>
        {topicList.map((t) => (
          <TopicTag key={t.topic} active={topic === t.topic} href={hrefFor({ topic: t.topic, q, sort, page: 1 })}>
            {t.topic} ({t.count})
          </TopicTag>
        ))}
      </div>

      {/* sort + search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {SORTS.map((s) => (
            <Link
              key={s.key}
              href={hrefFor({ topic, q, sort: s.key, page: 1 })}
              className={`btn ${sort === s.key ? 'btn-solid' : ''}`}
            >
              {s.label}
            </Link>
          ))}
        </div>
        <form method="GET" style={{ display: 'flex' }}>
          <input type="hidden" name="sort" value={sort} />
          {topic ? <input type="hidden" name="topic" value={topic} /> : null}
          <input type="search" name="q" defaultValue={q} placeholder="Search questions…" className="input" style={{ width: 200, borderRight: 'none' }} />
          <button type="submit" className="btn btn-solid" style={{ borderLeft: 'none' }}>
            Search
          </button>
        </form>
      </div>

      {/* results */}
      {list.items.length === 0 ? (
        <div className="card-flat" style={{ textAlign: 'center', padding: '30px 12px' }}>
          <p className="muted">No questions found.</p>
          {q || topic ? (
            <p className="muted">Try a different search or topic.</p>
          ) : null}
          <Link href="/qa/ask" className="btn btn-solid">
            Ask the first one
          </Link>
        </div>
      ) : (
        <div className="row-list">
          {list.items.map((item) => (
            <Link key={item.id} href={`/qa/${item.slug}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <span style={{ fontWeight: 700 }}>{item.title}</span>
                {item.bodyMd ? (
                  <span className="muted" style={{ display: 'block', fontSize: 12 }}>
                    {mdToText(item.bodyMd, 140)}
                  </span>
                ) : null}
                <span className="meta" style={{ display: 'block' }}>
                  {item.topic ? `${item.topic} · ` : ''}
                  {item.viewCount} views · {item.authorName ? `asked by ${item.authorName}` : ''} ·{' '}
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                <div style={{ fontWeight: 800, color: 'var(--pink)' }}>{item.answerCount}</div>
                <div className="faint" style={{ fontSize: 10 }}>
                  answer{item.answerCount === 1 ? '' : 's'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* pagination */}
      {totalPages > 1 ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
          {page > 1 ? (
            <Link href={hrefFor({ topic, q, sort, page: page - 1 })} className="btn">
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="meta">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={hrefFor({ topic, q, sort, page: page + 1 })} className="btn">
              Next
            </Link>
          ) : (
            <span />
          )}
        </div>
      ) : null}
    </div>
  );
}

function TopicTag({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`tag ${active ? 'tag-pink' : ''}`}
      style={active ? { borderWidth: 1 } : undefined}
    >
      {children}
    </Link>
  );
}

function hrefFor({ topic, q, sort, page }: { topic: string; q: string; sort: string; page: number }) {
  const params = new URLSearchParams();
  if (topic) params.set('topic', topic);
  if (q) params.set('q', q);
  if (sort !== 'newest') params.set('sort', sort);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/qa?${qs}` : '/qa';
}
