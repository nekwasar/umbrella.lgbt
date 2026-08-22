'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/admin-api';
import { PagePayload, PageForm } from '@/components/admin/PageForm';
import { Banner, Button, PageHeader } from '@/components/admin/ui';
import { useState } from 'react';

export default function NewPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(payload: PagePayload) {
    setError(null);
    try {
      const res = await api<{ page: { id: string } }>('/api/admin/pages', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      router.push(`/admin/pages/${res.page.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create page');
      throw err;
    }
  }

  return (
    <div>
      <PageHeader
        title="New page"
        subtitle="Create a page from scratch — every field is optional except title."
        actions={
          <Link href="/admin/pages">
            <Button variant="secondary">Back to pages</Button>
          </Link>
        }
      />
      {error ? <Banner kind="error" className="mb-4">{error}</Banner> : null}
      <PageForm
        initial={null}
        mode="create"
        onSubmit={onSubmit}
        onCancel={() => router.push('/admin/pages')}
      />
    </div>
  );
}
