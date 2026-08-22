import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { fetchPublicPage } from '@/lib/data';
import { pageMetadata } from '@/lib/meta';
import { absUrl, articleJson } from '@/lib/seo';
import { ArticleView } from '@/components/public/ArticleView';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';

export const revalidate = 300;

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchPublicPage('BLOG', slug);
  if (!data) return { title: 'Blog | Umbrella.lgbt' };
  return pageMetadata(data.page, { ogType: 'article' });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  const data = await fetchPublicPage('BLOG', slug);
  if (!data) notFound();
  const p = data.page;
  const url = absUrl(p.url);

  const article = articleJson({
    title: p.title,
    url,
    author: p.meta?.authorName || p.author || null,
    publishedAt: p.meta?.publishedTime || p.date?.slice(0, 10) || null,
    updatedAt: p.meta?.modifiedTime || null,
    description: p.meta?.metaDescription || null
  });

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }} />
      <Breadcrumbs parts={[{ name: 'Blog', url: absUrl('/blog') }, { name: p.title }]} />
      <ArticleView
        label="Blog"
        page={p}
        related={data.related}
        crossLinks={data.crossLinks ?? []}
        metaLine={
          <>
            {p.date ? <time>{new Date(p.date).toLocaleDateString()}</time> : null}
            {p.readingTime ? <> · {p.readingTime} min read</> : null}
            {p.meta?.authorName || p.author ? <> · {p.meta?.authorName || p.author}</> : null}
          </>
        }
      />
    </article>
  );
}
