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
  const data = await fetchPublicPage('RESOURCES', slug);
  if (!data) return { title: 'Resources | Umbrella.lgbt' };
  return pageMetadata(data.page);
}

export default async function ResourcePage({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  const data = await fetchPublicPage('RESOURCES', slug);
  if (!data) notFound();
  const p = data.page;
  const url = absUrl(p.url);

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webpageJson(p.title, url)) }} />
      <Breadcrumbs parts={[{ name: 'Resources', url: absUrl('/resources') }, { name: p.title }]} />
      <ArticleView label="Resources" page={p} related={data.related} crossLinks={data.crossLinks ?? []} />
    </article>
  );
}
