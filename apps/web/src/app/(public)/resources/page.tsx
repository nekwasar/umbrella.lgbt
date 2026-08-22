import type { Metadata } from 'next';
import { connection } from 'next/server';
import { fetchPageList } from '@/lib/data';
import { TypeIndexView } from '@/components/public/TypeIndexView';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Resources | Umbrella.lgbt',
  description:
    'Country-by-country LGBTQ+ resources — helplines, legal aid, shelters, health, and community organizations.',
  alternates: { canonical: 'https://umbrella.lgbt/resources' }
};

export default async function ResourcesIndexPage() { 
  await connection();
  const data = await fetchPageList('RESOURCES', { pageSize: 100 });
  return (
    <TypeIndexView
      label="Resources"
      urlPrefix="/resources"
      items={data?.items ?? []}
      emptyText="Country resources coming soon."
    />
  );
}
