import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../../db/prisma';
import { requireUser } from '../../middleware/auth';
import { forumPostSchema, forumTopicSchema } from '../../validation/forum';
import { serializePost, serializeTopic } from '../../lib/forum';

const router = Router();

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, try again later' }
});

/** POST /api/forum/board/:slug/topics — start a topic (auth). Creates topic + opening post. */
router.post('/board/:slug/topics', writeLimiter, requireUser, async (req, res) => {
  const parsed = forumTopicSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid topic' });
  }
  const board = await prisma.forumBoard.findUnique({ where: { slug: req.params.slug } });
  if (!board) return res.status(404).json({ error: 'Board not found' });

  const { title, bodyMd } = parsed.data;
  const topic = await prisma.forumTopic.create({
    data: {
      boardId: board.id,
      userId: req.authUser!.id,
      title: title.trim(),
      status: 'PUBLISHED',
      posts: {
        create: { userId: req.authUser!.id, bodyMd, status: 'PUBLISHED' }
      }
    },
    include: {
      user: { select: { displayName: true, username: true } },
      board: { select: { slug: true, name: true } },
      _count: { select: { posts: true } }
    }
  });
  res.status(201).json({ topic: serializeTopic(topic) });
});

/** POST /api/forum/topic/:id/posts — reply (auth). Locked topics reject. */
router.post('/topic/:id/posts', writeLimiter, requireUser, async (req, res) => {
  const parsed = forumPostSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid post' });
  }
  const topic = await prisma.forumTopic.findUnique({ where: { id: req.params.id } });
  if (!topic || topic.status !== 'PUBLISHED') {
    return res.status(404).json({ error: 'Topic not found' });
  }
  if (topic.locked) return res.status(403).json({ error: 'This topic is locked' });

  const [post] = await prisma.$transaction([
    prisma.forumPost.create({
      data: {
        topicId: topic.id,
        userId: req.authUser!.id,
        bodyMd: parsed.data.bodyMd,
        status: 'PUBLISHED'
      },
      include: { user: true }
    }),
    prisma.forumTopic.update({ where: { id: topic.id }, data: { updatedAt: new Date() } })
  ]);

  const counts = await prisma.forumPost.groupBy({
    by: ['userId'],
    where: { userId: post.userId, status: 'PUBLISHED' },
    _count: true
  });
  res.status(201).json({ post: serializePost(post, { [post.userId]: counts[0]?._count ?? 1 }) });
});

export default router;
