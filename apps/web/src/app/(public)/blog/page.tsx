import type { Metadata } from 'next';
import { connection } from 'next/server';
import { fetchPageList } from '@/lib/data';
import { TypeIndexView } from '@/components/public/TypeIndexView';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Blog | Umbrella.lgbt',
  description:
    'Essays and guides on queer life — coming out, community, identity, health, and more from Umbrella.lgbt.',
  alternates: { canonical: 'https://umbrella.lgbt/blog' }
};

export default async function BlogIndexPage() {
  await connection();
  const data = await fetchPageList('BLOG', { pageSize: 100 });
  return (
    <TypeIndexView
      label="Blog"
      urlPrefix="/blog"
      items={data?.items ?? []}
      emptyText="Blog posts coming soon."
    />
  );
}
