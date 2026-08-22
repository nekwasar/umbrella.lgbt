import type { Metadata } from 'next';
import { connection } from 'next/server';
import { fetchPageList } from '@/lib/data';
import { TypeIndexView } from '@/components/public/TypeIndexView';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'City Guides | Umbrella.lgbt',
  description:
    'Queer city guides — safe neighborhoods, bars, community centers, and events in cities around the world.',
  alternates: { canonical: 'https://umbrella.lgbt/city' }
};

export default async function CityIndexPage() { 
  await connection();
  const data = await fetchPageList('CITY', { pageSize: 100 });
  return (
    <TypeIndexView
      label="City Guides"
      urlPrefix="/city"
      items={data?.items ?? []}
      emptyText="City guides coming soon."
    />
  );
}
