import { Suspense } from 'react';
import { PagesManager } from '@/components/admin/PagesManager';

export const metadata = { title: 'Pages | Admin | Umbrella.lgbt' };

export default async function AdminPagesPage({
  searchParams
}: {
  searchParams: Promise<{ type?: string; status?: string }>;
}) {
  const params = await searchParams;
  return (
    <Suspense fallback={null}>
      <PagesManager initialType={params.type} initialStatus={params.status} />
    </Suspense>
  );
}
