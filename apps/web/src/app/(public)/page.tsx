import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { apiFetch, fetchPageList, fetchTypeCount } from '@/lib/data';
import { mdToText } from '@/lib/sanitize';
import { Page, QuestionListResponse } from '@/lib/types';
import { Wordmark } from '@/components/public/PublicHeader';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Umbrella.lgbt — The everything queer app',
  description:
    'Community. Meet. Q&A. A platform built by and for the LGBTQ+ community. Find queer community, answers, events, and resources — all under one umbrella.',
  alternates: { canonical: 'https://umbrella.lgbt' }
};

const homeJson = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Umbrella.lgbt',
  url: 'https://umbrella.lgbt',
  isPartOf: { '@type': 'WebSite', name: 'Umbrella.lgbt', url: 'https://umbrella.lgbt' }
};

export default async function HomePage() {
  await connection();
  const [blog, qaRes, cities, glossaryCount, qaCount, cityCount, resourcesCount] = await Promise.all([
    fetchPageList('BLOG', { pageSize: 2 }),
    apiFetch<QuestionListResponse>('/api/qa?pageSize=2&sort=popular'),
    fetchPageList('CITY', { pageSize: 6 }),
    fetchTypeCount('GLOSSARY'),
    fetchTypeCount('QA'),
    fetchTypeCount('CITY'),
    fetchTypeCount('RESOURCES')
  ]);

  const qaItems = qaRes?.items ?? [];
  const cityItems = cities?.items ?? [];

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJson) }} />

      {/* hero */}
      <section className="rainbow-frame" style={{ padding: '26px 20px', textAlign: 'center', marginBottom: 18 }}>
        <Wordmark size={52} />
        <h1 style={{ fontSize: 20, margin: '10px 0 2px' }}>The everything queer app.</h1>
        <p className="muted" style={{ margin: 0 }}>
          Community. Meet. Q&amp;A.
        </p>
        <p className="muted" style={{ maxWidth: 560, margin: '10px auto 0', fontSize: 12 }}>
          A platform built by and for the LGBTQ+ community. Not just another dating app — an umbrella
          for all of us.
        </p>
        <div style={{ marginTop: 12 }}>
          <Link href="/waitlist" className="btn btn-solid" style={{ padding: '6px 18px', fontSize: 14 }}>
            Coming 2026
          </Link>
        </div>
      </section>

      {/* stats */}
      <section className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: 8, marginBottom: 18, padding: '10px 8px' }}>
        <Stat n={glossaryCount ?? '50+'} label="Glossary Terms" />
        <Stat n={qaCount ?? '50+'} label="Q&A Answers" />
        <Stat n={cityCount ?? '20'} label="City Guides" />
        <Stat n={resourcesCount ?? '10'} label="Country Resources" />
      </section>

      {/* the problem */}
      <section style={{ marginBottom: 18 }}>
        <div className="band rainbow">The problem</div>
        <div className="card-flat" style={{ borderTop: 'none' }}>
          <p style={{ marginTop: 0 }}>
            Every existing platform fragments our community. Dating apps aren&apos;t community. Reddit
            isn&apos;t owned by us. We&apos;re building the space that should have existed.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
            <MiniCard title="The dating-app trap">
              Queer people who want friends, guidance, or community have no dedicated home.
            </MiniCard>
            <MiniCard title="Fragmentation">
              Gay men here, lesbians there, trans people everywhere and nowhere.
            </MiniCard>
            <MiniCard title="No safe space for youth">
              Queer teenagers have nowhere safe online. They deserve better than a comment section.
            </MiniCard>
          </div>
        </div>
      </section>

      {/* what's under the umbrella */}
      <section style={{ marginBottom: 18 }}>
        <div className="band rainbow">What&apos;s under the umbrella</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 10, marginTop: 8 }}>
          <MiniCard title="Community">Real-life meetups, events, found family. Move from screen to street.</MiniCard>
          <MiniCard title="Meet">Browse queer people near you. No swipes, no algorithms, just people.</MiniCard>
          <MiniCard title="Q&A">Ask questions, get answers — public, permanent, Google-indexed.</MiniCard>
          <MiniCard title="Safe by Design">Age-gated, encrypted, anonymous mode. No data sold.</MiniCard>
          <MiniCard title="For Everyone">Gay, lesbian, bi, trans, non-binary, ace, aromantic, questioning, two-spirit.</MiniCard>
        </div>
      </section>

      {/* identities */}
      <section style={{ marginBottom: 18 }}>
        <div className="band">Built for every identity</div>
        <div className="card-flat" style={{ borderTop: 'none', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {['Gay', 'Lesbian', 'Bisexual', 'Transgender', 'Non-binary', 'Intersex', 'Asexual', 'Aromantic', 'Questioning', 'Two-Spirit'].map((id) => (
            <span key={id} className="tag tag-pink">
              {id}
            </span>
          ))}
        </div>
      </section>

      {/* coming banner */}
      <section className="card" style={{ textAlign: 'center', marginBottom: 18, padding: '14px 12px' }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>Coming 2026 — The everything queer app</p>
        <p className="muted" style={{ margin: '4px 0 0' }}>
          There&apos;s room under the umbrella.
        </p>
      </section>

      {/* blog + qa previews */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 14, marginBottom: 18 }}>
        <div>
          <div className="band">
            Recent from the blog
            <Link href="/blog" className="band-link">
              all →
            </Link>
          </div>
          <div className="row-list" style={{ borderTop: 'none' }}>
            {(blog?.items ?? []).map((p) => (
              <Link key={p.id} href={`/blog/${p.slug}`}>
                <span style={{ fontWeight: 600 }}>{p.title}</span>
                <span className="meta" style={{ display: 'block' }}>
                  {p.date ? new Date(p.date).toLocaleDateString() : ''} · {p.readingTime} min read
                </span>
              </Link>
            ))}
            {(blog?.items ?? []).length === 0 ? (
              <div className="muted" style={{ fontStyle: 'italic' }}>
                Blog posts coming soon.
              </div>
            ) : null}
          </div>
        </div>

        <div>
          <div className="band">
            Trending Q&amp;A
            <Link href="/qa" className="band-link">
              all →
            </Link>
          </div>
          <div className="row-list" style={{ borderTop: 'none' }}>
            {qaItems.map((q) => (
              <Link key={q.id} href={`/qa/${q.slug}`}>
                <span style={{ fontWeight: 600 }}>{q.title}</span>
                <span className="meta" style={{ display: 'block' }}>
                  {q.answerCount} answer{q.answerCount === 1 ? '' : 's'}
                </span>
              </Link>
            ))}
            {qaItems.length === 0 ? (
              <div className="muted" style={{ fontStyle: 'italic' }}>
                Q&amp;A coming soon.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* city guides */}
      <section>
        <div className="band">
          City guides
          <Link href="/city" className="band-link">
            all →
          </Link>
        </div>
        <div className="card-flat" style={{ borderTop: 'none', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 8 }}>
          {cityItems.map((c) => (
            <Link key={c.id} href={`/city/${c.slug}`} className="btn" style={{ justifyContent: 'space-between', textAlign: 'left' }}>
              <span>{cityName(c.title)}</span>
              <span aria-hidden>→</span>
            </Link>
          ))}
          {cityItems.length === 0 ? (
            <div className="muted" style={{ fontStyle: 'italic' }}>
              City guides coming soon.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Stat({ n, label }: { n: number | string; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--pink)' }}>{n}</div>
      <div className="faint" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
    </div>
  );
}

function MiniCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-flat">
      <h3 style={{ margin: 0, fontSize: 14 }}>{title}</h3>
      <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
        {children}
      </p>
    </div>
  );
}

function cityName(title: string): string {
  return title.replace(/^Queer\s+/, '').replace(/\s+Guide$/, '');
}
