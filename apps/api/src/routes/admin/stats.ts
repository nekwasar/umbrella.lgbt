import { Router } from 'express';
import { prisma } from '../../db/prisma';
import { requireAdmin } from '../../middleware/auth';
import { serializePage } from '../../lib/pages';

const router = Router();

router.get('/', requireAdmin, async (_req, res) => {
  const [byType, published, drafts, users, questions, answers, comments, reports, recentPages] =
    await Promise.all([
      prisma.page.groupBy({ by: ['type'], _count: true }),
      prisma.page.count({ where: { status: 'PUBLISHED' } }),
      prisma.page.count({ where: { status: 'DRAFT' } }),
      prisma.user.count(),
      prisma.question.count(),
      prisma.answer.count(),
      prisma.comment.count(),
      prisma.report.count(),
      prisma.page.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: { meta: true }
      })
    ]);

  res.json({
    pages: {
      total: published + drafts,
      published,
      drafts,
      byType
    },
    users,
    questions,
    answers,
    comments,
    reports,
    recentPages: recentPages.map(serializePage)
  });
});

export default router;
