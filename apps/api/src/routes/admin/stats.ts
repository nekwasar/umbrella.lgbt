import { Router } from 'express';
import { prisma } from '../../db/prisma';
import { requireAdmin } from '../../middleware/auth';
import { serializePage } from '../../lib/pages';

const router = Router();

router.get('/', requireAdmin, async (_req, res) => {
  const [byType, published, drafts, users, questions, answers, comments, reports, recentPages, bulletins, forumBoards, forumTopics, forumPosts, pendingReports, recentQuestions, recentBulletins] =
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
      }),
      prisma.bulletin.count({ where: { status: 'PUBLISHED' } }),
      prisma.forumBoard.count(),
      prisma.forumTopic.count(),
      prisma.forumPost.count(),
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.question.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          user: { select: { username: true } },
          _count: { select: { answers: { where: { status: 'PUBLISHED' } } } }
        }
      }),
      prisma.bulletin.findMany({
        orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
        take: 5
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
    pendingReports,
    bulletins,
    forum: {
      boards: forumBoards,
      topics: forumTopics,
      posts: forumPosts
    },
    recentPages: recentPages.map(serializePage),
    recentQuestions: recentQuestions.map((q) => ({
      id: q.id,
      slug: q.slug,
      title: q.title,
      author: q.user.username,
      answerCount: q._count?.answers ?? 0,
      createdAt: q.createdAt.toISOString()
    })),
    recentBulletins: recentBulletins.map((b) => ({
      id: b.id,
      title: b.title,
      pinned: b.pinned,
      status: b.status,
      createdAt: b.createdAt.toISOString()
    }))
  });
});

export default router;
