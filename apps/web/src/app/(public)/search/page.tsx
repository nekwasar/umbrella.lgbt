import type { Metadata } from 'next';
import Link from 'next/link';
import { apiFetch, fetchPageList } from '@/lib/data';
import { QuestionListResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Search | Umbrella.lgbt',
  robots: { index: false, follow: true }
};

export default async function SearchPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';

  const [pages, qaRes] = query
    ? await Promise.all([
        fetchPageList('', { q: query, pageSize: 20 }),
        apiFetch<QuestionListResponse>(`/api/qa?q=${encodeURIComponent(query)}&pageSize=20`)
      ])
    : [null, null];

  const pageItems = pages?.items ?? [];
  const qaItems = qaRes?.items ?? [];

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 10 }}>Search</h1>
      <form method="GET" action="/search" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search Umbrella.lgbt…"
          className="input"
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn-solid">
          Search
        </button>
      </form>

      {!query ? (
        <p className="muted">Type a query above to search pages and questions.</p>
      ) : pageItems.length === 0 && qaItems.length === 0 ? (
        <p className="muted">No results for &ldquo;{query}&rdquo;.</p>
      ) : (
        <>
          {pageItems.length > 0 ? (
            <section style={{ marginBottom: 16 }}>
              <div className="band">Pages</div>
              <div className="row-list" style={{ borderTop: 'none' }}>
                {pageItems.map((p) => (
                  <Link key={p.id} href={p.url}>
                    <span style={{ fontWeight: 600 }}>{p.title}</span>
                    <span className="meta" style={{ display: 'block' }}>
                      /{p.url} · {p.type.toLowerCase()}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {qaItems.length > 0 ? (
            <section>
              <div className="band">Q&amp;A</div>
              <div className="row-list" style={{ borderTop: 'none' }}>
                {qaItems.map((q) => (
                  <Link key={q.id} href={`/qa/${q.slug}`}>
                    <span style={{ fontWeight: 600 }}>{q.title}</span>
                    <span className="meta" style={{ display: 'block' }}>
                      {q.answerCount} answer{q.answerCount === 1 ? '' : 's'}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
