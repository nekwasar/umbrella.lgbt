import { Router } from 'express';
import { prisma } from '../../db/prisma';
import { requireAdmin } from '../../middleware/auth';
import { bulkMetaSchema, pageMetaSchema, pageUpsertSchema } from '../../validation/page';
import { pageTypeLabel, readingTime, serializePage, slugify } from '../../lib/pages';

const router = Router();

/** Use `data[key]` when explicitly present (allows clearing nullable fields), else fallback. */
function field<T>(data: Record<string, unknown>, key: string, fallback: T): T {
  return key in data ? (data[key] as T) : fallback;
}

function normalizeMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = { ...meta };
  for (const k of ['publishedTime', 'modifiedTime']) {
    if (normalized[k] != null) normalized[k] = new Date(normalized[k] as string);
  }
  if (normalized.jsonldExtra == null) delete normalized.jsonldExtra;
  return normalized;
}

// --- list (with filters) ---
router.get('/', requireAdmin, async (req, res) => {
  const { type, status, seeded, q, topic, category } = req.query as Record<string, string | undefined>;
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) || '20', 10) || 20));

  const where: Record<string, unknown> = {};
  if (type) where.type = type.toUpperCase();
  if (status) where.status = status.toUpperCase();
  if (seeded !== undefined) where.seeded = seeded === 'true';
  if (topic) where.topic = topic;
  if (category) where.category = category;
  if (q) where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { slug: { contains: q, mode: 'insensitive' } }];

  const [total, items] = await Promise.all([
    prisma.page.count({ where }),
    prisma.page.findMany({
      where,
      include: { meta: true },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    })
  ]);

  res.json({ total, page, pageSize, items: items.map(serializePage) });
});

// --- bulk meta-only update (must be declared before :id routes) ---
router.post('/meta/bulk', requireAdmin, async (req, res) => {
  const parsed = bulkMetaSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid bulk meta payload' });
  }

  let updated = 0;
  for (const item of parsed.data.items) {
    const meta = normalizeMeta(item.meta as Record<string, unknown>);
    const result = await prisma.pageMeta.upsert({
      where: { pageId: item.id },
      create: { pageId: item.id, ...meta },
      update: meta
    });
    if (result) updated++;
  }

  res.json({ ok: true, updated });
});

// --- get by id ---
router.get('/:id', requireAdmin, async (req, res) => {
  const page = await prisma.page.findUnique({ where: { id: req.params.id }, include: { meta: true } });
  if (!page) return res.status(404).json({ error: 'Page not found' });
  res.json({ page: serializePage(page) });
});

// --- create ---
router.post('/', requireAdmin, async (req, res) => {
  const parsed = pageUpsertSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid page data' });
  }

  const data = parsed.data;
  const slug = data.slug || slugify(data.title);

  const clash = await prisma.page.findUnique({ where: { type_slug: { type: data.type, slug } } });
  if (clash) {
    return res.status(409).json({ error: `A ${pageTypeLabel(data.type)} page with slug "${slug}" already exists` });
  }

  const contentMd = data.contentMd ?? '';
  const status = data.status ?? 'PUBLISHED';
  const seeded = data.seeded ?? status === 'PUBLISHED';

  const page = await prisma.page.create({
    data: {
      type: data.type,
      slug,
      title: data.title,
      contentMd,
      status,
      seeded,
      topic: data.topic ?? null,
      category: data.category ?? null,
      date: data.date ? new Date(data.date) : null,
      author: data.author ?? null,
      readingTime: readingTime(contentMd),
      publishedAt: status === 'PUBLISHED' ? new Date() : null,
      meta: data.meta ? { create: normalizeMeta(data.meta as Record<string, unknown>) } : undefined
    },
    include: { meta: true }
  });

  res.status(201).json({ page: serializePage(page) });
});

// --- update ---
router.put('/:id', requireAdmin, async (req, res) => {
  const parsed = pageUpsertSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid page data' });
  }

  const existing = await prisma.page.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Page not found' });

  const data = parsed.data;
  const type = field(data, 'type', existing.type);
  const slug = data.slug || existing.slug;

  const clash = await prisma.page.findUnique({ where: { type_slug: { type, slug } } });
  if (clash && clash.id !== existing.id) {
    return res.status(409).json({ error: `A ${pageTypeLabel(type)} page with slug "${slug}" already exists` });
  }

  const status = field(data, 'status', existing.status);
  const contentMd = field(data, 'contentMd', existing.contentMd);
  const seeded = field(data, 'seeded', existing.seeded);

  const page = await prisma.page.update({
    where: { id: existing.id },
    data: {
      type,
      slug,
      title: data.title,
      contentMd,
      status,
      seeded,
      topic: field(data, 'topic', existing.topic),
      category: field(data, 'category', existing.category),
      date: data.date ? new Date(data.date) : existing.date,
      author: field(data, 'author', existing.author),
      readingTime: readingTime(contentMd),
      publishedAt: status === 'PUBLISHED' ? (existing.publishedAt ?? new Date()) : null,
      meta: data.meta
        ? {
            upsert: {
              create: normalizeMeta(data.meta as Record<string, unknown>),
              update: normalizeMeta(data.meta as Record<string, unknown>)
            }
          }
        : undefined
    },
    include: { meta: true }
  });

  res.json({ page: serializePage(page) });
});

// --- meta-only update (single page) ---
router.patch('/:id/meta', requireAdmin, async (req, res) => {
  const parsed = pageMetaSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid meta payload' });
  }

  const existing = await prisma.page.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Page not found' });

  const meta = normalizeMeta(parsed.data as Record<string, unknown>);
  const pageMeta = await prisma.pageMeta.upsert({
    where: { pageId: existing.id },
    create: { pageId: existing.id, ...meta },
    update: meta
  });

  res.json({ ok: true, meta: pageMeta });
});

// --- delete ---
router.delete('/:id', requireAdmin, async (req, res) => {
  const existing = await prisma.page.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Page not found' });

  await prisma.page.delete({ where: { id: existing.id } });
  res.json({ ok: true });
});

export default router;
