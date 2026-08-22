import type { Metadata } from 'next';
import { connection } from 'next/server';
import { fetchPageList } from '@/lib/data';
import { TypeIndexView } from '@/components/public/TypeIndexView';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Glossary | Umbrella.lgbt',
  description:
    'Clear, affirming definitions of LGBTQ+ terms — identities, health, relationships, and culture, from Umbrella.lgbt.',
  alternates: { canonical: 'https://umbrella.lgbt/glossary' }
};

export default async function GlossaryIndexPage() { 
  await connection();
  const data = await fetchPageList('GLOSSARY', { pageSize: 100 });
  return (
    <TypeIndexView
      label="Glossary"
      urlPrefix="/glossary"
      items={data?.items ?? []}
      emptyText="Glossary terms coming soon."
    />
  );
}
