import { Router } from 'express';
import { prisma } from '../../db/prisma';
import { requireAdmin } from '../../middleware/auth';
import { bulletinSchema } from '../../validation/forum';
import { serializeBulletin } from '../../lib/bulletin';
import { ADMIN_COOKIE } from '../../lib/cookies';
import { notifyWeb } from '../../lib/notify-web';

const router = Router();

// Public surfaces showing bulletins: homepage sidebar panel + /bulletin list + detail.
const BULLETIN_REVAL = { paths: ['/', '/bulletin', '/bulletin/[id]'], tags: ['bulletins'] };

/** GET /api/admin/bulletins — all bulletins incl. drafts. */
router.get('/', requireAdmin, async (_req, res) => {
  const items = await prisma.bulletin.findMany({
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    include: { _count: { select: { comments: { where: { status: 'PUBLISHED' } } } } }
  });
  res.json({ items: items.map((b) => serializeBulletin(b)) });
});

/** POST /api/admin/bulletins — create a bulletin. */
router.post('/', requireAdmin, async (req, res) => {
  const parsed = bulletinSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid bulletin' });
  }
  const b = await prisma.bulletin.create({
    data: {
      title: parsed.data.title.trim(),
      bodyMd: parsed.data.bodyMd ?? '',
      pinned: parsed.data.pinned ?? false,
      status: parsed.data.status ?? 'PUBLISHED'
    },
    include: { _count: { select: { comments: { where: { status: 'PUBLISHED' } } } } }
  });
  await notifyWeb(req.cookies?.[ADMIN_COOKIE], BULLETIN_REVAL);
  res.status(201).json({ bulletin: serializeBulletin(b) });
});

/** PUT /api/admin/bulletins/:id — update a bulletin. */
router.put('/:id', requireAdmin, async (req, res) => {
  const existing = await prisma.bulletin.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Bulletin not found' });

  const parsed = bulletinSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid bulletin' });
  }
  const b = await prisma.bulletin.update({
    where: { id: existing.id },
    data: {
      title: parsed.data.title.trim(),
      bodyMd: parsed.data.bodyMd ?? existing.bodyMd,
      pinned: parsed.data.pinned ?? existing.pinned,
      status: parsed.data.status ?? existing.status
    },
    include: { _count: { select: { comments: { where: { status: 'PUBLISHED' } } } } }
  });
  await notifyWeb(req.cookies?.[ADMIN_COOKIE], BULLETIN_REVAL);
  res.json({ bulletin: serializeBulletin(b) });
});

/** DELETE /api/admin/bulletins/:id — hard delete a bulletin (and its comments, via FK cascade). */
router.delete('/:id', requireAdmin, async (req, res) => {
  const existing = await prisma.bulletin.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Bulletin not found' });
  await prisma.bulletin.delete({ where: { id: existing.id } });
  await notifyWeb(req.cookies?.[ADMIN_COOKIE], BULLETIN_REVAL);
  res.json({ ok: true });
});

export default router;
