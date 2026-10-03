import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { apiFetch } from '@/lib/data';
import { timeAgo } from '@/lib/time';
import { mdToHtml, mdToText } from '@/lib/sanitize';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';
import { absUrl } from '@/lib/seo';
import { CommentSection } from '@/components/comments/CommentSection';
import type { BulletinDetailResponse } from '@/lib/types';

export const revalidate = 120;

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await apiFetch<BulletinDetailResponse>(`/api/bulletins/${id}`, 300, ['bulletins']);
  if (!data) return { title: 'Bulletin | Umbrella.lgbt' };
  return {
    title: `${data.bulletin.title} | Bulletin | Umbrella.lgbt`,
    description: mdToText(data.bulletin.bodyMd, 160),
    alternates: { canonical: absUrl(`/bulletin/${id}`) }
  };
}

export default async function BulletinDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await apiFetch<BulletinDetailResponse>(`/api/bulletins/${id}`, 300, ['bulletins']);
  if (!data) notFound();
  const b = data.bulletin;

  return (
    <article>
      <Breadcrumbs parts={[{ name: 'Bulletin', url: absUrl('/bulletin') }, { name: b.title }]} />
      <div className="band" style={{ marginBottom: 12 }}>
        {b.pinned ? '📌 ' : ''}
        Bulletin
      </div>
      <h1 style={{ marginBottom: 6 }}>{b.title}</h1>
      <div className="meta" style={{ marginBottom: 10 }}>
        posted {timeAgo(b.createdAt)}
      </div>
      <div
        className="md-preview card-flat"
        style={{ padding: '12px 14px' }}
        dangerouslySetInnerHTML={{ __html: mdToHtml(b.bodyMd) }}
      />
      <CommentSection targetType="BULLETIN" targetId={b.id} />
    </article>
  );
}
