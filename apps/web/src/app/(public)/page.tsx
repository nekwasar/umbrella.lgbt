import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { apiFetch, fetchPageList, fetchTypeCount } from '@/lib/data';
import { QuestionListResponse } from '@/lib/types';
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

const DIRECTORY = [
  { href: '/glossary', label: 'Glossary' },
  { href: '/qa', label: 'Q&A' },
  { href: '/city', label: 'City Guides' },
  { href: '/search?q=safe', label: 'Safe Spaces' },
  { href: '/search?q=legal', label: 'Legal Resources' }
];

const QUICK_JUMP = [
  { href: '#top', label: 'Top of page' },
  { href: '#problem', label: 'The problem' },
  { href: '#featured', label: 'Featured content' },
  { href: '#identities', label: 'Identities' },
  { href: '#hubs', label: 'Regional hubs' }
];

const ANNOUNCEMENTS = [
  { date: 'Sep 2026', text: 'Retro portal homepage is live. You are looking at it.' },
  { date: 'Sep 2026', text: 'Admin console and public API are online.' },
  { date: '2026', text: 'The full Umbrella app launches soon. Watch this space.' }
];

export default async function HomePage() {
  await connection();
  const [blog, qaRes, latestRes, cities, glossaryCount, qaCount, cityCount, resourcesCount] =
    await Promise.all([
      fetchPageList('BLOG', { pageSize: 2 }),
      apiFetch<QuestionListResponse>('/api/qa?pageSize=2&sort=popular'),
      apiFetch<QuestionListResponse>('/api/qa?pageSize=5&sort=newest'),
      fetchPageList('CITY', { pageSize: 6 }),
      fetchTypeCount('GLOSSARY'),
      fetchTypeCount('QA'),
      fetchTypeCount('CITY'),
      fetchTypeCount('RESOURCES')
    ]);

  const qaItems = qaRes?.items ?? [];
  const latestItems = latestRes?.items ?? [];
  const cityItems = cities?.items ?? [];

  const counts = [glossaryCount, qaCount, cityCount, resourcesCount].filter(
    (n): n is number => typeof n === 'number'
  );
  const totalIndexed = counts.length > 0 ? counts.reduce((a, b) => a + b, 0) : null;

  const stats: Array<[string, string]> = [
    ['Glossary Terms', String(glossaryCount ?? '50+')],
    ['Q&A Answers', String(qaCount ?? '50+')],
    ['City Guides', String(cityCount ?? '20')],
    ['Country Resources', String(resourcesCount ?? '10')]
  ];

  return (
    <div className="portal" id="top">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJson) }} />

      {/* ============ CENTER: main column ============ */}
      <div className="portal-main">
        {/* bulletin */}
        <section className="bulletin" aria-label="Community bulletin">
          <div className="bulletin-title">[ BULLETIN: Welcome to Umbrella ]</div>
          <ul>
            <li>
              {totalIndexed !== null ? `${totalIndexed} pages` : '150+ pages'} indexed and counting
              — new guides every week.
            </li>
            <li>
              Q&amp;A is open: <Link href="/qa/ask">ask a question</Link>, get answers from the
              community.
            </li>
            <li>
              The full app launches 2026. <Link href="/waitlist">Read the plan</Link>.
            </li>
          </ul>
        </section>

        {/* hero */}
        <section className="rainbow-frame" style={{ padding: '14px 12px', textAlign: 'left', marginBottom: 14 }}>
          <Wordmark size={40} />
          <h1 style={{ fontSize: 20, margin: '8px 0 2px' }}>The everything queer app.</h1>
          <p className="muted" style={{ margin: 0 }}>
            Community. Meet. Q&amp;A.
          </p>
          <p className="muted" style={{ maxWidth: 560, margin: '8px 0 0', fontSize: 12 }}>
            A platform built by and for the LGBTQ+ community. Not just another dating app — an umbrella
            for all of us.
          </p>
          <div style={{ marginTop: 10 }}>
            <Link href="/waitlist" className="btn btn-solid" style={{ padding: '4px 14px', fontSize: 13 }}>
              Coming 2026
            </Link>
          </div>
        </section>

        {/* the problem */}
        <section id="problem" style={{ marginBottom: 14 }}>
          <div className="band">The problem</div>
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
        <section style={{ marginBottom: 14 }}>
          <div className="band">What&apos;s under the umbrella</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10, marginTop: 8 }}>
            <MiniCard title="Community">Real-life meetups, events, found family. Move from screen to street.</MiniCard>
            <MiniCard title="Meet">Browse queer people near you. No swipes, no algorithms, just people.</MiniCard>
            <MiniCard title="Q&A">Ask questions, get answers — public, permanent, Google-indexed.</MiniCard>
            <MiniCard title="Safe by Design">Age-gated, encrypted, anonymous mode. No data sold.</MiniCard>
            <MiniCard title="For Everyone">Gay, lesbian, bi, trans, non-binary, ace, aromantic, questioning, two-spirit.</MiniCard>
          </div>
        </section>

        {/* featured */}
        <section id="featured" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12, marginBottom: 14 }}>
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

        {/* identities */}
        <section id="identities" style={{ marginBottom: 14 }}>
          <div className="band">Built for every identity</div>
          <div className="card-flat" style={{ borderTop: 'none', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['Gay', 'Lesbian', 'Bisexual', 'Transgender', 'Non-binary', 'Intersex', 'Asexual', 'Aromantic', 'Questioning', 'Two-Spirit'].map((id) => (
              <span key={id} className="tag tag-brown">
                {id}
              </span>
            ))}
          </div>
        </section>

        {/* coming banner */}
        <section className="card" style={{ textAlign: 'left', padding: '10px 8px' }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>Coming 2026 — The everything queer app</p>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            There&apos;s room under the umbrella.
          </p>
        </section>
      </div>

      {/* ============ LEFT: sidebar ============ */}
      <aside className="portal-left" aria-label="Directory sidebar">
        <section className="sidebox">
          <div className="sidebox-hd">Topic Directory</div>
          <div className="sidebox-bd">
            <ul className="dir-list">
              {DIRECTORY.map((d) => (
                <li key={d.href + d.label}>
                  <span className="bullet" aria-hidden="true">
                    »
                  </span>
                  <Link href={d.href}>{d.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="sidebox">
          <div className="sidebox-hd">Quick Jump</div>
          <div className="sidebox-bd">
            <ul className="dir-list">
              {QUICK_JUMP.map((d) => (
                <li key={d.href}>
                  <span className="bullet" aria-hidden="true">
                    »
                  </span>
                  <a href={d.href}>{d.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="sidebox" id="hubs">
          <div className="sidebox-hd">Regional Hubs</div>
          <div className="sidebox-bd">
            {cityItems.length > 0 ? (
              <table className="portal-table">
                <tbody>
                  {[0, 2, 4].map((row) => (
                    <tr key={row}>
                      {[0, 1].map((col) => {
                        const c = cityItems[row + col];
                        return (
                          <td key={col}>
                            {c ? <Link href={`/city/${c.slug}`}>{cityName(c.title)}</Link> : null}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="muted" style={{ margin: 0, fontStyle: 'italic' }}>
                City guides coming soon.
              </p>
            )}
          </div>
        </section>
      </aside>

      {/* ============ RIGHT: sidebar ============ */}
      <aside className="portal-right" aria-label="Community sidebar">
        <section className="sidebox">
          <div className="sidebox-hd">Announcements</div>
          <div className="sidebox-bd">
            <ul className="mini-list">
              {ANNOUNCEMENTS.map((a) => (
                <li key={a.date + a.text}>
                  <span className="tag">{a.date}</span>
                  <span className="meta">{a.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="sidebox">
          <div className="sidebox-hd">Latest Discussions</div>
          <div className="sidebox-bd">
            {latestItems.length > 0 ? (
              <ul className="mini-list">
                {latestItems.map((q) => (
                  <li key={q.id}>
                    <Link href={`/qa/${q.slug}`}>{q.title}</Link>
                    <span className="meta">
                      <span className="tag tag-brown">
                        {q.answerCount} {q.answerCount === 1 ? 'reply' : 'replies'}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted" style={{ margin: 0, fontStyle: 'italic' }}>
                Q&amp;A coming soon.
              </p>
            )}
          </div>
        </section>

        <section className="sidebox">
          <div className="sidebox-hd">Community Stats</div>
          <div className="sidebox-bd">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {stats.map(([label, value]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td style={{ fontWeight: 700 }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="sidebox">
          <div className="sidebox-hd">88×31 Badge Bar</div>
          <div className="sidebox-bd">
            <div className="badge-bar">
              <span className="badge88 badge88-pink">Made for LGBTQ+</span>
              <span className="badge88 badge88-blue">No Algorithms</span>
              <span className="badge88 badge88-green">Web 2.0</span>
            </div>
          </div>
        </section>
      </aside>
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
