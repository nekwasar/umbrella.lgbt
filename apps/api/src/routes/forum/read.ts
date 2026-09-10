import { Router } from 'express';
import { prisma } from '../../db/prisma';
import { serializeBoard, serializePost, serializeTopic } from '../../lib/forum';

const router = Router();

function parsePaging(req: { query: any }, defSize = 20, maxSize = 100) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(maxSize, Math.max(1, parseInt(req.query.pageSize, 10) || defSize));
  return { page, pageSize, skip: (page - 1) * pageSize };
}

async function boardStats(boardId: string) {
  const [topicCount, postCount, last] = await Promise.all([
    prisma.forumTopic.count({ where: { boardId, status: 'PUBLISHED' } }),
    prisma.forumPost.count({ where: { topic: { boardId, status: 'PUBLISHED' }, status: 'PUBLISHED' } }),
    prisma.forumPost.findFirst({
      where: { topic: { boardId, status: 'PUBLISHED' }, status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { displayName: true, username: true } },
        topic: { select: { id: true, title: true } }
      }
    })
  ]);
  return {
    postCount,
    lastPost: last
      ? {
          topicId: last.topic.id,
          topicTitle: last.topic.title,
          authorName: last.user.displayName || last.user.username,
          createdAt: last.createdAt.toISOString()
        }
      : null,
    _topicCount: topicCount
  };
}

/**
 * GET /api/forum — board index grouped by category.
 * Optional ?q= filters boards by name/description/category.
 */
router.get('/', async (req, res) => {
  const q = typeof req.query.q === 'string' && req.query.q.trim() ? req.query.q.trim() : null;
  const boards = await prisma.forumBoard.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { category: { contains: q, mode: 'insensitive' } }
          ]
        }
      : undefined,
    orderBy: [{ category: 'asc' }, { position: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { topics: { where: { status: 'PUBLISHED' } } } } }
  });

  const withStats = await Promise.all(
    boards.map(async (b) => {
      const stats = await boardStats(b.id);
      return serializeBoard({ ...b, _count: { topics: stats._topicCount }, ...stats });
    })
  );

  const categories: Array<{ name: string; boards: ReturnType<typeof serializeBoard>[] }> = [];
  for (const b of withStats) {
    let cat = categories.find((c) => c.name === b.category);
    if (!cat) {
      cat = { name: b.category, boards: [] };
      categories.push(cat);
    }
    cat.boards.push(b);
  }
  res.json({ categories });
});

/**
 * GET /api/forum/board/:slug — topic list.
 * ?sort=top|recent (default recent), ?page=&pageSize=
 */
router.get('/board/:slug', async (req, res) => {
  const board = await prisma.forumBoard.findUnique({ where: { slug: req.params.slug } });
  if (!board) return res.status(404).json({ error: 'Board not found' });

  const sort = req.query.sort === 'top' ? 'top' : 'recent';
  const { page, pageSize, skip } = parsePaging(req);
  const orderBy: any[] = [{ pinned: 'desc' }];
  if (sort === 'top') {
    orderBy.push({ posts: { _count: 'desc' } }, { updatedAt: 'desc' });
  } else {
    orderBy.push({ updatedAt: 'desc' });
  }

  const [total, topics] = await Promise.all([
    prisma.forumTopic.count({ where: { boardId: board.id, status: 'PUBLISHED' } }),
    prisma.forumTopic.findMany({
      where: { boardId: board.id, status: 'PUBLISHED' },
      orderBy,
      skip,
      take: pageSize,
      include: {
        user: { select: { displayName: true, username: true } },
        board: { select: { slug: true, name: true } },
        _count: { select: { posts: { where: { status: 'PUBLISHED' } } } },
        posts: {
          where: { status: 'PUBLISHED' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { user: { select: { displayName: true, username: true } } }
        }
      }
    })
  ]);

  res.json({
    board: serializeBoard(board),
    sort,
    total,
    page,
    pageSize,
    items: topics.map((t) => {
      const last = (t as any).posts[0];
      return serializeTopic({
        ...t,
        lastPost: last
          ? {
              authorName: last.user.displayName || last.user.username,
              createdAt: last.createdAt.toISOString()
            }
          : null
      });
    })
  });
});

/**
 * GET /api/forum/topic/:id — topic + posts (oldest first). ?page=&pageSize=
 */
router.get('/topic/:id', async (req, res) => {
  const topic = await prisma.forumTopic.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { displayName: true, username: true } },
      board: { select: { slug: true, name: true } },
      _count: { select: { posts: { where: { status: 'PUBLISHED' } } } }
    }
  });
  if (!topic || topic.status !== 'PUBLISHED') {
    return res.status(404).json({ error: 'Topic not found' });
  }

  const { page, pageSize, skip } = parsePaging(req, 50);
  const [total, posts] = await Promise.all([
    prisma.forumPost.count({ where: { topicId: topic.id, status: 'PUBLISHED' } }),
    prisma.forumPost.findMany({
      where: { topicId: topic.id, status: 'PUBLISHED' },
      orderBy: { createdAt: 'asc' },
      skip,
      take: pageSize,
      include: { user: true }
    })
  ]);

  const authorIds = [...new Set(posts.map((p) => p.userId))];
  const counts = await prisma.forumPost.groupBy({
    by: ['userId'],
    where: { userId: { in: authorIds }, status: 'PUBLISHED' },
    _count: true
  });
  const countMap: Record<string, number> = {};
  for (const c of counts) countMap[c.userId] = c._count;

  // Fire-and-forget view count (don't block the response on failure).
  prisma.forumTopic
    .update({ where: { id: topic.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => {});

  res.json({
    topic: serializeTopic(topic),
    total,
    page,
    pageSize,
    items: posts.map((p) => serializePost(p, countMap))
  });
});

export default router;
