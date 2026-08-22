import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

router.get('/', requireAdmin, async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q : undefined;
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) || '20', 10) || 20));

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { username: { contains: q, mode: 'insensitive' } },
      { displayName: { contains: q, mode: 'insensitive' } }
    ];
  }

  const [total, items] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        username: true,
        displayName: true,
        pronouns: true,
        isBanned: true,
        createdAt: true,
        lastLoginAt: true,
        _count: { select: { questions: true, answers: true, comments: true } }
      }
    })
  ]);

  res.json({
    total,
    page,
    pageSize,
    items: items.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      pronouns: u.pronouns,
      isBanned: u.isBanned,
      createdAt: u.createdAt.toISOString(),
      lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
      counts: u._count
    }))
  });
});

const banSchema = z.object({ isBanned: z.boolean() });

router.patch('/:id', requireAdmin, async (req, res) => {
  const parsed = banSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input' });
  }
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  await prisma.user.update({ where: { id: user.id }, data: { isBanned: parsed.data.isBanned } });
  res.json({ ok: true, isBanned: parsed.data.isBanned });
});

export default router;
