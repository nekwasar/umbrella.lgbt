import { Page, PageMeta } from '@prisma/client';
import { PageType } from '../validation/page';

export function readingTime(md: string): number {
  if (!md) return 0;
  return Math.max(1, Math.ceil(md.split(/\s+/).length / 200));
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 150);
}

const TYPE_PATH: Record<PageType, string> = {
  CORE: '',
  BLOG: 'blog',
  QA: 'qa',
  GLOSSARY: 'glossary',
  CITY: 'city',
  RESOURCES: 'resources'
};

export function pageURL(type: PageType, slug: string): string {
  const path = TYPE_PATH[type];
  return path ? `/${path}/${slug}` : `/${slug}`;
}

export function pageTypeLabel(type: PageType): string {
  const labels: Record<PageType, string> = {
    CORE: 'Core',
    BLOG: 'Blog',
    QA: 'Q&A',
    GLOSSARY: 'Glossary',
    CITY: 'City Guides',
    RESOURCES: 'Resources'
  };
  return labels[type] || type;
}

export function serializeMeta(meta?: PageMeta | null) {
  if (!meta) return null;
  const { pageId: _omit, ...rest } = meta;
  return {
    ...rest,
    jsonldExtra: rest.jsonldExtra ?? null,
    publishedTime: rest.publishedTime ? rest.publishedTime.toISOString() : null,
    modifiedTime: rest.modifiedTime ? rest.modifiedTime.toISOString() : null
  };
}

export type PageWithMeta = Page & { meta?: PageMeta | null };

export function serializePage(page: PageWithMeta) {
  const { meta, ...rest } = page;
  return {
    id: rest.id,
    type: rest.type,
    slug: rest.slug,
    title: rest.title,
    status: rest.status,
    seeded: rest.seeded,
    topic: rest.topic,
    category: rest.category,
    date: rest.date ? rest.date.toISOString() : null,
    author: rest.author,
    readingTime: rest.readingTime,
    publishedAt: rest.publishedAt ? rest.publishedAt.toISOString() : null,
    createdAt: rest.createdAt.toISOString(),
    updatedAt: rest.updatedAt.toISOString(),
    contentMd: rest.contentMd,
    url: pageURL(rest.type, rest.slug),
    meta: serializeMeta(meta)
  };
}
