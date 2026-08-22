import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { fetchPublicPage } from '@/lib/data';
import { pageMetadata } from '@/lib/meta';
import { absUrl, definedTermJson } from '@/lib/seo';
import { mdToText } from '@/lib/sanitize';
import { ArticleView } from '@/components/public/ArticleView';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';

export const revalidate = 300;

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchPublicPage('GLOSSARY', slug);
  if (!data) return { title: 'Glossary | Umbrella.lgbt' };
  return pageMetadata(data.page);
}

export default async function GlossaryTermPage({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  const data = await fetchPublicPage('GLOSSARY', slug);
  if (!data) notFound();
  const p = data.page;
  const url = absUrl(p.url);

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(definedTermJson(p.title, url, mdToText(p.contentMd, 500)))
        }}
      />
      <Breadcrumbs parts={[{ name: 'Glossary', url: absUrl('/glossary') }, { name: p.title }]} />
      <ArticleView
        label="Glossary"
        page={p}
        related={data.related}
        crossLinks={data.crossLinks ?? []}
        metaLine={p.category ? <span className="tag tag-purple">{p.category}</span> : null}
      />
    </article>
  );
}
