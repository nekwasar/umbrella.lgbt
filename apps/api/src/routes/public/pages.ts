import { Router } from 'express';
import { Page, Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { PAGE_TYPES, PageType } from '../../validation/page';
import { getRelatedPages } from '../../lib/related';
import { serializePage } from '../../lib/pages';

const router = Router();

function parseType(raw: unknown): PageType | null {
  if (typeof raw !== 'string') return null;
  const upper = raw.toUpperCase();
  return (PAGE_TYPES as readonly string[]).includes(upper) ? (upper as PageType) : null;
}

// --- list published pages (optionally by type) ---
router.get('/', async (req, res) => {
  const type = parseType(req.query.type);
  if (req.query.type && !type) {
    return res.status(400).json({ error: `Invalid type. Allowed: ${PAGE_TYPES.join(', ')}` });
  }

  const q = typeof req.query.q === 'string' ? req.query.q : undefined;
  const topic = typeof req.query.topic === 'string' ? req.query.topic : undefined;
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const includeBody = req.query.body === '1' || req.query.body === 'true';
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) || '50', 10) || 50));

  const where: Record<string, unknown> = { status: 'PUBLISHED' };
  if (type) where.type = type;
  if (topic) where.topic = topic;
  if (category) where.category = category;
  if (q) where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { slug: { contains: q, mode: 'insensitive' } }];

  const [total, items] = await Promise.all([
    prisma.page.count({ where }),
    prisma.page.findMany({
      where,
      include: { meta: true },
      orderBy: [{ date: 'desc' }, { updatedAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize
    })
  ]);

  const serialized = items.map((p) => {
    const s = serializePage(p);
    if (!includeBody) s.contentMd = '';
    return s;
  });

  res.json({ total, page, pageSize, items: serialized });
});

// --- single published page (with meta + related) ---
router.get('/:type/:slug', async (req, res) => {
  const type = parseType(req.params.type);
  if (!type) {
    return res.status(400).json({ error: `Invalid type. Allowed: ${PAGE_TYPES.join(', ')}` });
  }

  const page = await prisma.page.findUnique({
    where: { type_slug: { type, slug: req.params.slug } },
    include: { meta: true }
  });

  if (!page || page.status !== 'PUBLISHED') {
    return res.status(404).json({ error: 'Page not found' });
  }

  const related = await getRelatedPages(page.id, page.type, page.topic, page.category);
  const crossLinks = await getCrossLinks(page.type);
  res.json({
    page: serializePage(page),
    related: related.map(serializePage),
    crossLinks: crossLinks.map(serializePage)
  });
});

/**
 * Cross-type internal links for SEO: blog ↔ glossary ↔ Q&A (static pages).
 * Mirrors the legacy build's cross-linking behaviour.
 */
async function getCrossLinks(type: PageType): Promise<Page[]> {
  const take = { take: 3 };
  let queries: Prisma.PageFindManyArgs[] = [];
  if (type === 'BLOG') {
    queries = [
      { where: { type: 'GLOSSARY', status: 'PUBLISHED' }, orderBy: { updatedAt: 'desc' }, take: 2 },
      { where: { type: 'QA', status: 'PUBLISHED' }, orderBy: { updatedAt: 'desc' }, take: 2 }
    ];
  } else if (type === 'GLOSSARY') {
    queries = [{ where: { type: 'QA', status: 'PUBLISHED' }, orderBy: { updatedAt: 'desc' }, ...take }];
  } else if (type === 'QA') {
    queries = [{ where: { type: 'GLOSSARY', status: 'PUBLISHED' }, orderBy: { updatedAt: 'desc' }, ...take }];
  } else {
    return [];
  }

  const results = await Promise.all(queries.map((q) => prisma.page.findMany(q)));
  const seen = new Set<string>();
  const out: Page[] = [];
  for (const group of results) {
    for (const p of group) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
      if (out.length >= 4) return out;
    }
  }
  return out;
}

export default router;
