import { Router } from 'express';
import { prisma } from '../../db/prisma';
import { requireAdmin } from '../../middleware/auth';
import { boardSchema } from '../../validation/forum';
import { slugify } from '../../lib/slug';
import { serializeBoard } from '../../lib/forum';
import { boardStats } from '../forum/read';

const router = Router();

async function withStats(board: any) {
  const stats = await boardStats(board.id);
  return serializeBoard({ ...board, _count: { topics: stats._topicCount }, ...stats });
}

/** GET /api/admin/boards — all boards with topic/post counts. */
router.get('/', requireAdmin, async (_req, res) => {
  const boards = await prisma.forumBoard.findMany({
    orderBy: [{ category: 'asc' }, { position: 'asc' }, { name: 'asc' }]
  });
  res.json({ items: await Promise.all(boards.map(withStats)) });
});

/** POST /api/admin/boards — create a board (slug auto-generated when omitted). */
router.post('/', requireAdmin, async (req, res) => {
  const parsed = boardSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid board' });
  }
  const data = parsed.data;
  const slug = data.slug || slugify(data.name) || 'board';
  const clash = await prisma.forumBoard.findUnique({ where: { slug } });
  if (clash) return res.status(409).json({ error: `A board with slug "${slug}" already exists` });

  const board = await prisma.forumBoard.create({
    data: {
      category: data.category.trim(),
      name: data.name.trim(),
      slug,
      description: (data.description ?? '').trim(),
      position: data.position ?? 0
    }
  });
  res.status(201).json({ board: await withStats(board) });
});

/** PUT /api/admin/boards/:id — update a board. */
router.put('/:id', requireAdmin, async (req, res) => {
  const existing = await prisma.forumBoard.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Board not found' });

  const parsed = boardSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid board' });
  }
  const data = parsed.data;
  const slug = data.slug || existing.slug;
  if (slug !== existing.slug) {
    const clash = await prisma.forumBoard.findUnique({ where: { slug } });
    if (clash) return res.status(409).json({ error: `A board with slug "${slug}" already exists` });
  }

  const board = await prisma.forumBoard.update({
    where: { id: existing.id },
    data: {
      category: data.category.trim(),
      name: data.name.trim(),
      slug,
      description: (data.description ?? '').trim(),
      position: data.position ?? 0
    }
  });
  res.json({ board: await withStats(board) });
});

/** DELETE /api/admin/boards/:id — delete a board and all its topics + posts. */
router.delete('/:id', requireAdmin, async (req, res) => {
  const existing = await prisma.forumBoard.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Board not found' });
  await prisma.forumBoard.delete({ where: { id: existing.id } });
  res.json({ ok: true });
});

export default router;
