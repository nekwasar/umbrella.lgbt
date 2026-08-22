import type { MetadataRoute } from 'next';
import { SERVER_API_URL } from '@/lib/server';
import { SITE } from '@/lib/seo';
import { Page, PageListResponse, QuestionSummary } from '@/lib/types';

export const dynamic = 'force-dynamic';

const CORE: Array<{ path: string; priority: number; freq: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
  { path: '/', priority: 1.0, freq: 'weekly' },
  { path: '/about', priority: 0.8, freq: 'monthly' },
  { path: '/features', priority: 0.8, freq: 'monthly' },
  { path: '/waitlist', priority: 0.6, freq: 'monthly' },
  { path: '/press', priority: 0.5, freq: 'monthly' },
  { path: '/contact', priority: 0.5, freq: 'monthly' },
  { path: '/privacy', priority: 0.4, freq: 'yearly' }
];

const TYPE_PRIORITY: Record<Page['type'], number> = {
  CORE: 0.8,
  QA: 0.9,
  BLOG: 0.8,
  GLOSSARY: 0.7,
  CITY: 0.6,
  RESOURCES: 0.6
};

const TYPE_INDEXES: Array<{ path: string; type: Page['type'] | null; priority: number }> = [
  { path: '/blog', type: 'BLOG', priority: 0.7 },
  { path: '/glossary', type: 'GLOSSARY', priority: 0.7 },
  { path: '/qa', type: 'QA', priority: 0.7 },
  { path: '/city', type: 'CITY', priority: 0.6 },
  { path: '/resources', type: 'RESOURCES', priority: 0.6 }
];

async function fetchPages(type: Page['type']): Promise<PageListResponse | null> {
  try {
    const res = await fetch(`${SERVER_API_URL}/api/pages?type=${type}&pageSize=100`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as PageListResponse;
  } catch {
    return null;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  const seen = new Set<string>();

  function add(url: string, lastModified: Date | undefined, freq: MetadataRoute.Sitemap[number]['changeFrequency'], priority: number) {
    if (seen.has(url)) return;
    seen.add(url);
    entries.push({ url, lastModified, changeFrequency: freq, priority });
  }

  for (const c of CORE) {
    add(`${SITE.url}${c.path}`, new Date(), c.freq, c.priority);
  }

  for (const idx of TYPE_INDEXES) {
    if (idx.type === null) continue;
    const data = await fetchPages(idx.type);
    if (data) {
      add(`${SITE.url}${idx.path}`, new Date(), 'weekly', idx.priority);
      for (const p of data.items) {
        add(`${SITE.url}${p.url}`, new Date(p.updatedAt), 'monthly', TYPE_PRIORITY[p.type]);
      }
    }
  }

  // dynamic questions (highest SEO value)
  try {
    const res = await fetch(`${SERVER_API_URL}/api/qa?pageSize=100`, { cache: 'no-store' });
    if (res.ok) {
      const body = (await res.json()) as { items: QuestionSummary[] };
      for (const q of body.items) {
        add(`${SITE.url}/qa/${q.slug}`, new Date(q.updatedAt), 'weekly', 0.9);
      }
    }
  } catch {
    /* sitemap still valid without questions */
  }

  return entries;
}
