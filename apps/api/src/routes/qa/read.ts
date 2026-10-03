import { Router } from 'express';
import { CommentTargetType, Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { optionalUser } from '../../middleware/auth';
import { buildCommentTree, serializeAnswer, serializeQuestion } from '../../lib/qa';
import { hybridSearch } from '../../lib/search';
import { recordSearchQuery } from '../../lib/search-log';

const router = Router();

// --- topic directory ---
router.get('/topics', async (_req, res) => {
  const grouped = await prisma.question.groupBy({
    by: ['topic'],
    where: { status: 'PUBLISHED', NOT: { topic: null } },
    _count: true,
    orderBy: { _count: { topic: 'desc' } }
  });
  res.json({
    topics: grouped.map((t) => ({ topic: t.topic as string, count: t._count }))
  });
});

// --- list published questions ---
router.get('/', async (req, res) => {
  const topic = typeof req.query.topic === 'string' ? req.query.topic : undefined;
  const q = typeof req.query.q === 'string' ? req.query.q : undefined;
  const rawSort = typeof req.query.sort === 'string' ? req.query.sort : undefined;
  const sort = rawSort ?? 'newest';
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt((req.query.pageSize as string) || '20', 10) || 20));

  const where: Record<string, unknown> = { status: 'PUBLISHED' };
  if (topic) where.topic = topic;
  if (q) where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { bodyMd: { contains: q, mode: 'insensitive' } }];
  if (sort === 'unanswered') where.answers = { none: {} };

  // Hybrid engine (opt-in): blended FTS + TF-IDF relevance ranking.
  // Relevance by default; an explicit route sort still wins. Sorts the
  // hybrid layer doesn't model (views, unanswered) fall back to relevance.
  if (q && req.query.engine === 'hybrid') {
    try {
      const hybridSort =
        rawSort === undefined
          ? 'score'
          : rawSort === 'newest'
            ? 'new'
            : rawSort === 'popular'
              ? 'votes'
              : 'score';
      const result = await hybridSearch({ q, topic, sort: hybridSort, page, pageSize });
      await recordSearchQuery(q, result.total, req.authUser?.id);
      return res.json({
        total: result.total,
        page,
        pageSize,
        items: result.items.map((it) => serializeQuestion(it))
      });
    } catch (err) {
      console.warn('[qa] hybrid search failed, falling back to keyword filter:', err);
    }
  }

  let orderBy: Record<string, unknown>[] | Record<string, unknown> = [{ createdAt: 'desc' }];
  if (sort === 'popular') {
    orderBy = [{ answers: { _count: 'desc' } }, { viewCount: 'desc' }];
  } else if (sort === 'views') {
    orderBy = [{ viewCount: 'desc' }];
  }

  const [total, items] = await Promise.all([
    prisma.question.count({ where }),
    prisma.question.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { id: true, username: true, displayName: true } },
        _count: { select: { answers: true } }
      }
    })
  ]);

  if (q) await recordSearchQuery(q, total, req.authUser?.id);

  res.json({
    total,
    page,
    pageSize,
    items: items.map((it) => serializeQuestion(it))
  });
});

// --- single question (with answers, comments, votes, related) ---
router.get('/:slug', optionalUser, async (req, res) => {
  const question = await prisma.question.findUnique({
    where: { slug: req.params.slug },
    include: { user: { select: { id: true, username: true, displayName: true } } }
  });

  if (!question || question.status !== 'PUBLISHED') {
    return res.status(404).json({ error: 'Question not found' });
  }

  await prisma.question.update({ where: { id: question.id }, data: { viewCount: { increment: 1 } } });
  question.viewCount += 1;

  const answers = await prisma.answer.findMany({
    where: { questionId: question.id, status: 'PUBLISHED' },
    include: { user: { select: { id: true, username: true, displayName: true } } }
  });

  // user's votes on these answers
  let userVotes: Record<string, number> = {};
  if (req.authUser) {
    const votes = await prisma.answerVote.findMany({
      where: { userId: req.authUser.id, answerId: { in: answers.map((a) => a.id) } }
    });
    userVotes = Object.fromEntries(votes.map((v) => [v.answerId, v.value]));
  }

  const answerIds = answers.map((a) => a.id);
  const comments = await prisma.comment.findMany({
    where: {
      status: 'PUBLISHED',
      OR: [
        { targetType: 'QUESTION', targetId: question.id },
        ...(answerIds.length
          ? [{ targetType: 'ANSWER' as CommentTargetType, targetId: { in: answerIds } }]
          : [])
      ]
    },
    include: { user: { select: { id: true, username: true, displayName: true } } },
    orderBy: { createdAt: 'asc' }
  });

  const questionComments = buildCommentTree(comments.filter((c) => c.targetType === 'QUESTION' && c.targetId === question.id));

  // sort answers: pinned best first, then votes desc, then oldest first
  answers.sort((a, b) => (b.isBest ? 1 : 0) - (a.isBest ? 1 : 0) || b.votes - a.votes || a.createdAt.getTime() - b.createdAt.getTime());

  const serializedAnswers = answers.map((a) =>
    serializeAnswer({
      ...a,
      userVote: userVotes[a.id] ?? null,
      comments: buildCommentTree(comments.filter((c) => c.targetType === 'ANSWER' && c.targetId === a.id))
    })
  );

  // related questions (same topic first, then by views)
  const related = await prisma.question.findMany({
    where: {
      status: 'PUBLISHED',
      id: { not: question.id },
      ...(question.topic ? { topic: question.topic } : {})
    },
    orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
    take: 5,
    include: { _count: { select: { answers: true } } }
  });

  res.json({
    question: serializeQuestion(question, { answerCount: answers.length }),
    answers: serializedAnswers,
    questionComments,
    userVotes,
    me: req.authUser ? { id: req.authUser.id, username: req.authUser.username } : null,
    related: related.map((r) => serializeQuestion(r))
  });
});

export default router;
