import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { fetchPublicPage } from '@/lib/data';
import { pageMetadata } from '@/lib/meta';
import { absUrl, webpageJson } from '@/lib/seo';
import { ArticleView } from '@/components/public/ArticleView';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';

export const revalidate = 300;

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchPublicPage('CITY', slug);
  if (!data) return { title: 'City Guides | Umbrella.lgbt' };
  const p = data.page;
  const meta = pageMetadata(p);
  const geo = p.meta?.geoPosition ? p.meta.geoPosition.replace(';', ',') : undefined;
  const other: Record<string, string> = {};
  if (geo) {
    other['geo.region'] = p.meta?.geoRegion ?? '';
    other['geo.placename'] = p.meta?.geoPlacename ?? '';
    other['geo.position'] = geo;
    other.ICBM = geo;
  }
  return { ...meta, other: Object.keys(other).length ? other : undefined };
}

export default async function CityGuidePage({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  const data = await fetchPublicPage('CITY', slug);
  if (!data) notFound();
  const p = data.page;
  const url = absUrl(p.url);

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webpageJson(p.title, url)) }} />
      <Breadcrumbs parts={[{ name: 'City Guides', url: absUrl('/city') }, { name: p.title }]} />
      <ArticleView label="City Guides" page={p} related={data.related} crossLinks={data.crossLinks ?? []} />
    </article>
  );
}
