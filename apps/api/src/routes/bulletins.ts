import { Router } from 'express';
import { prisma } from '../db/prisma';
import { serializeBulletin } from '../lib/bulletin';

const router = Router();

/**
 * GET /api/bulletins — published bulletins, pinned first, then newest.
 * ?page=&pageSize= (default 20, max 50)
 */
router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? ''), 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(String(req.query.pageSize ?? ''), 10) || 20));

  const [total, items] = await Promise.all([
    prisma.bulletin.count({ where: { status: 'PUBLISHED' } }),
    prisma.bulletin.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { comments: { where: { status: 'PUBLISHED' } } } } }
    })
  ]);

  res.json({ total, page, pageSize, items: items.map((b) => serializeBulletin(b)) });
});

/** GET /api/bulletins/:id — one published bulletin. */
router.get('/:id', async (req, res) => {
  const bulletin = await prisma.bulletin.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { comments: { where: { status: 'PUBLISHED' } } } } }
  });
  if (!bulletin || bulletin.status !== 'PUBLISHED') {
    return res.status(404).json({ error: 'Bulletin not found' });
  }
  res.json({ bulletin: serializeBulletin(bulletin) });
});

export default router;
