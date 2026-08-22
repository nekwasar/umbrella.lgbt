'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/admin-api';
import { Page } from '@/lib/types';
import { PagePayload, PageForm } from '@/components/admin/PageForm';
import { Badge, Banner, Button, EmptyState, PageHeader, Spinner } from '@/components/admin/ui';

export default function EditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [page, setPage] = useState<Page | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api<{ page: Page }>(`/api/admin/pages/${params.id}`)
      .then((res) => setPage(res.page))
      .catch((err) => setError(err.message));
  }, [params.id]);

  async function onSubmit(payload: PagePayload) {
    setError(null);
    setSaved(false);
    try {
      await api(`/api/admin/pages/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      setSaved(true);
      // refresh local state so the prefilled form reflects the latest
      const res = await api<{ page: Page }>(`/api/admin/pages/${params.id}`);
      setPage(res.page);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save page');
      throw err;
    }
  }

  if (error && !page) {
    return (
      <div>
        <PageHeader title="Edit page" />
        <EmptyState>{error}</EmptyState>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-8 w-8 text-muted" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Edit page"
        subtitle={`${page.title}`}
        actions={
          <>
            <span className="mr-2 hidden text-xs text-faint sm:inline">/{page.url}</span>
            <Badge tone={page.status === 'PUBLISHED' ? 'good' : 'warn'}>{page.status.toLowerCase()}</Badge>
            <Link href="/admin/pages">
              <Button variant="secondary">Back to pages</Button>
            </Link>
          </>
        }
      />
      {saved ? <Banner kind="success" className="mb-4">Saved.</Banner> : null}
      {error ? <Banner kind="error" className="mb-4">{error}</Banner> : null}
      <PageForm
        initial={page}
        mode="edit"
        onSubmit={onSubmit}
        onCancel={() => router.push('/admin/pages')}
      />
    </div>
  );
}
