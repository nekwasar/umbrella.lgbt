import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { fetchPublicPage } from '@/lib/data';
import { mdToHtml } from '@/lib/sanitize';
import { pageMetadata } from '@/lib/meta';
import { absUrl, webpageJson } from '@/lib/seo';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';

export const revalidate = 300;

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchPublicPage('CORE', slug);
  if (!data) return { title: 'Umbrella.lgbt' };
  return pageMetadata(data.page);
}

export default async function CorePage({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  const data = await fetchPublicPage('CORE', slug);
  if (!data) notFound();
  const p = data.page;
  const url = absUrl(p.url);

  return (
    <div className="card-flat" style={{ maxWidth: 760, margin: '0 auto' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webpageJson(p.title, url)) }} />
      <Breadcrumbs parts={[{ name: p.title }]} />
      <div className="band">Umbrella.lgbt</div>
      <h1 style={{ padding: '10px 4px 0' }}>{p.title}</h1>
      {p.contentMd ? (
        <div
          className="md-preview"
          style={{ padding: '0 4px 10px' }}
          dangerouslySetInnerHTML={{ __html: mdToHtml(p.contentMd) }}
        />
      ) : (
        <p className="muted" style={{ padding: '0 4px 10px' }}>
          Coming soon.
        </p>
      )}
    </div>
  );
}
