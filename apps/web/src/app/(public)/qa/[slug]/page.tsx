import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { SERVER_API_URL } from '@/lib/server';
import { fetchPublicPage } from '@/lib/data';
import { mdToHtml, mdToText } from '@/lib/sanitize';
import { pageMetadata } from '@/lib/meta';
import { absUrl, faqJson } from '@/lib/seo';
import { Page, QuestionDetail } from '@/lib/types';
import { QuestionView } from '@/components/qa/QuestionView';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';

export const dynamic = 'force-dynamic';

const getQuestion = cache(async (slug: string): Promise<QuestionDetail | null> => {
  const res = await fetch(`${SERVER_API_URL}/api/qa/${slug}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return (await res.json()) as QuestionDetail;
});

const getStaticQAPage = cache(async (slug: string) => fetchPublicPage('QA', slug));

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getQuestion(slug);
  if (detail) {
    const { question } = detail;
    const desc = mdToText(question.bodyMd, 155) || `${question.title}. A question from the Umbrella.lgbt Q&A.`;
    const url = absUrl(`/qa/${question.slug}`);
    return {
      title: `${question.title} | Umbrella.lgbt`,
      description: desc,
      alternates: { canonical: url },
      openGraph: { title: `${question.title} | Umbrella.lgbt`, description: desc, url, type: 'article' },
      robots: { index: true, follow: true }
    };
  }
  const staticPage = await getStaticQAPage(slug);
  if (staticPage) return pageMetadata(staticPage.page);
  return { title: 'Q&A | Umbrella.lgbt' };
}

export default async function QuestionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = await getQuestion(slug);

  if (detail) {
    const { question, answers, related } = detail;
    const best = answers.find((a) => a.isBest);
    const suggested = answers.filter((a) => !a.isBest).slice(0, 5);

    const qaJson = {
      '@context': 'https://schema.org',
      '@type': 'QAPage',
      mainEntity: {
        '@type': 'Question',
        name: question.title,
        text: mdToText(question.bodyMd, 5000),
        answerCount: answers.length,
        author: { '@type': 'Person', name: question.authorName || 'Anonymous' },
        datePublished: question.createdAt,
        ...(best
          ? {
              acceptedAnswer: {
                '@type': 'Answer',
                text: mdToText(best.bodyMd, 5000),
                upvoteCount: best.votes,
                author: { '@type': 'Person', name: best.authorName },
                dateCreated: best.createdAt
              }
            }
          : {}),
        suggestedAnswer: suggested.map((a) => ({
          '@type': 'Answer',
          text: mdToText(a.bodyMd, 5000),
          upvoteCount: a.votes,
          author: { '@type': 'Person', name: a.authorName },
          dateCreated: a.createdAt
        }))
      }
    };

    return (
      <div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(qaJson) }} />
        <Breadcrumbs parts={[{ name: 'Q&A', url: absUrl('/qa') }, { name: question.title }]} />
        <QuestionView initial={detail} />
        {related.length > 0 ? (
          <aside style={{ marginTop: 18 }}>
            <div className="band">Related questions</div>
            <div className="row-list" style={{ borderTop: 'none' }}>
              {related.map((r) => (
                <Link key={r.id} href={`/qa/${r.slug}`}>
                  <span style={{ fontWeight: 600 }}>{r.title}</span>
                </Link>
              ))}
            </div>
          </aside>
        ) : null}
      </div>
    );
  }

  // Fallback: migrated static Q&A page (type QA in the pages registry)
  const staticPage = await getStaticQAPage(slug);
  if (!staticPage) notFound();
  const p: Page = staticPage.page;
  const url = absUrl(p.url);

  return (
    <article style={{ maxWidth: 760, margin: '0 auto' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJson(p.title, mdToText(p.contentMd, 5000), url)) }}
      />
      <Breadcrumbs parts={[{ name: 'Q&A', url: absUrl('/qa') }, { name: p.title }]} />
      <div className="band" style={{ marginBottom: 12 }}>
        Q&amp;A
      </div>
      <h1 style={{ marginBottom: 8 }}>{p.title}</h1>
      {p.topic ? <span className="tag tag-pink">{p.topic}</span> : null}
      {p.contentMd ? (
        <div className="md-preview card-flat" style={{ marginTop: 12, padding: '12px 14px' }} dangerouslySetInnerHTML={{ __html: mdToHtml(p.contentMd) }} />
      ) : (
        <p className="muted">Coming soon.</p>
      )}

      {(staticPage.related.length > 0 || (staticPage.crossLinks?.length ?? 0) > 0) ? (
        <aside style={{ marginTop: 18 }}>
          <div className="band">Related</div>
          <div className="row-list" style={{ borderTop: 'none' }}>
            {[...(staticPage.crossLinks ?? []), ...staticPage.related].map((r) => (
              <Link key={r.id} href={r.url}>
                <span style={{ fontWeight: 600 }}>{r.title}</span>
              </Link>
            ))}
          </div>
        </aside>
      ) : null}
    </article>
  );
}
