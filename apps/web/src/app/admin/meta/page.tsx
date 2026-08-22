import { Suspense } from 'react';
import { MetaEditor } from '@/components/admin/MetaEditor';

export const metadata = { title: 'Meta Editor | Admin | Umbrella.lgbt' };

export default async function AdminMetaPage({
  searchParams
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  return (
    <Suspense fallback={null}>
      <MetaEditor initialType={params.type} />
    </Suspense>
  );
}
