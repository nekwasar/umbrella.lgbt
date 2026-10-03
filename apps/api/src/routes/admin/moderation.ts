import { Router } from 'express';
import { prisma } from '../../db/prisma';
import { requireAdmin } from '../../middleware/auth';
import { logQuestionAction } from '../../lib/question-log';

const router = Router();

const preview = (md: string | null | undefined, max = 140) => {
  const text = (md ?? '').replace(/[#*`>\[\]()]/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text;
};

/** GET /api/admin/moderation/reports?status=PENDING|PUBLISHED|REMOVED|all */
router.get('/reports', requireAdmin, async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : 'PENDING';
  const where =
    status === 'all' ? undefined : { status: status as 'PENDING' | 'PUBLISHED' | 'REMOVED' };

  const reports = await prisma.report.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { reporter: { select: { username: true, displayName: true, isBanned: true } } }
  });

  // Attach a content preview for each reported target.
  const items = await Promise.all(
    reports.map(async (r) => {
      let contentPreview: string | null = null;
      let contentAuthor: string | null = null;
      let targetExists = true;

      if (r.targetType === 'QUESTION') {
        const t = await prisma.question.findUnique({
          where: { id: r.targetId },
          include: { user: { select: { username: true } } }
        });
        if (t) {
          contentPreview = t.title + ' — ' + preview(t.bodyMd);
          contentAuthor = t.user.username;
        } else targetExists = false;
      } else if (r.targetType === 'ANSWER') {
        const t = await prisma.answer.findUnique({
          where: { id: r.targetId },
          include: { user: { select: { username: true } } }
        });
        if (t) {
          contentPreview = preview(t.bodyMd);
          contentAuthor = t.user.username;
        } else targetExists = false;
      } else if (r.targetType === 'COMMENT') {
        const t = await prisma.comment.findUnique({
          where: { id: r.targetId },
          include: { user: { select: { username: true } } }
        });
        if (t) {
          contentPreview = preview(t.bodyMd);
          contentAuthor = t.user?.username ?? t.authorName ?? 'Anonymous';
        } else targetExists = false;
      } else if (r.targetType === 'USER') {
        const t = await prisma.user.findUnique({ where: { id: r.targetId } });
        if (t) {
          contentPreview = `@${t.username}${t.isBanned ? ' (already banned)' : ''}`;
          contentAuthor = t.username;
        } else targetExists = false;
      } else if (r.targetType === 'PAGE') {
        const t = await prisma.page.findUnique({ where: { id: r.targetId } });
        if (t) {
          contentPreview = t.title;
          contentAuthor = t.author ?? null;
        } else targetExists = false;
      } else if (r.targetType === 'FORUM_TOPIC') {
        const t = await prisma.forumTopic.findUnique({
          where: { id: r.targetId },
          include: { user: { select: { username: true } } }
        });
        if (t) {
          contentPreview = t.title;
          contentAuthor = t.user.username;
        } else targetExists = false;
      } else if (r.targetType === 'FORUM_POST') {
        const t = await prisma.forumPost.findUnique({
          where: { id: r.targetId },
          include: { user: { select: { username: true } } }
        });
        if (t) {
          contentPreview = preview(t.bodyMd);
          contentAuthor = t.user.username;
        } else targetExists = false;
      }

      return {
        id: r.id,
        targetType: r.targetType,
        targetId: r.targetId,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        reporter: {
          id: r.reporterId,
          username: r.reporter.username,
          displayName: r.reporter.displayName,
          isBanned: r.reporter.isBanned
        },
        contentPreview,
        contentAuthor,
        targetExists
      };
    })
  );

  res.json({ items });
});

/** PATCH /api/admin/moderation/reports/:id — resolve (PUBLISHED) or dismiss (REMOVED). */
router.patch('/reports/:id', requireAdmin, async (req, res) => {
  const report = await prisma.report.findUnique({ where: { id: req.params.id } });
  if (!report) return res.status(404).json({ error: 'Report not found' });
  const status = req.body?.status;
  if (status !== 'PUBLISHED' && status !== 'REMOVED') {
    return res.status(400).json({ error: 'status must be PUBLISHED (resolved) or REMOVED (dismissed)' });
  }
  await prisma.report.update({ where: { id: report.id }, data: { status } });
  res.json({ ok: true });
});

/** GET /api/admin/moderation/qa?type=questions|answers|comments|forum-topics|forum-posts */
router.get('/qa', requireAdmin, async (req, res) => {
  const type = typeof req.query.type === 'string' ? req.query.type : 'questions';

  if (type === 'questions') {
    const items = await prisma.question.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { user: { select: { username: true } }, _count: { select: { answers: true } } }
    });
    return res.json({
      items: items.map((q) => ({
        id: q.id,
        title: q.title,
        preview: preview(q.bodyMd),
        author: q.user.username,
        status: q.status,
        meta: `${q._count.answers} answers · ${q.viewCount} views`,
        createdAt: q.createdAt.toISOString()
      }))
    });
  }

  if (type === 'answers') {
    const items = await prisma.answer.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { username: true } },
        question: { select: { title: true, id: true } }
      }
    });
    return res.json({
      items: items.map((a) => ({
        id: a.id,
        title: `re: ${a.question.title}`,
        preview: preview(a.bodyMd),
        author: a.user.username,
        status: a.status,
        meta: `${a.votes} votes${a.isBest ? ' · best' : ''} · question ${a.question.id}`,
        createdAt: a.createdAt.toISOString()
      }))
    });
  }

  if (type === 'comments') {
    const items = await prisma.comment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { user: { select: { username: true } } }
    });
    return res.json({
      items: items.map((c) => ({
        id: c.id,
        title: `${c.targetType.toLowerCase()} comment`,
        preview: preview(c.bodyMd),
        author: c.user?.username ?? c.authorName ?? 'Anonymous',
        status: c.status,
        meta: `target ${c.targetType}`,
        createdAt: c.createdAt.toISOString()
      }))
    });
  }

  if (type === 'forum-topics') {
    const items = await prisma.forumTopic.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { user: { select: { username: true } }, board: { select: { name: true } } }
    });
    return res.json({
      items: items.map((t) => ({
        id: t.id,
        title: t.title,
        preview: t.board.name,
        author: t.user.username,
        status: t.status,
        meta: `${t.pinned ? 'pinned · ' : ''}${t.locked ? 'locked · ' : ''}${t.viewCount} views`,
        createdAt: t.createdAt.toISOString()
      }))
    });
  }

  // forum-posts
  const items = await prisma.forumPost.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      user: { select: { username: true } },
      topic: { select: { title: true, board: { select: { name: true } } } }
    }
  });
  return res.json({
    items: items.map((p) => ({
      id: p.id,
      title: `re: ${p.topic.title} (${p.topic.board.name})`,
      preview: preview(p.bodyMd),
      author: p.user.username,
      status: p.status,
      meta: 'forum reply',
      createdAt: p.createdAt.toISOString()
    }))
  });
});

/** Soft-remove content: body carries { kind, id }. Mirrors DELETE endpoints below. */
router.post('/remove', requireAdmin, async (req, res) => {
  const { kind, id } = req.body ?? {};
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'id required' });

  switch (kind) {
    case 'question': {
      const t = await prisma.question.findUnique({ where: { id } });
      if (!t) return res.status(404).json({ error: 'Question not found' });
      if (t.status !== 'REMOVED') {
        await prisma.question.update({ where: { id }, data: { status: 'REMOVED' } });
        await logQuestionAction({
          questionId: t.id,
          action: 'removed',
          actor: {
            id: req.authAdmin?.id ?? null,
            name: req.authAdmin?.username ?? null,
            kind: 'admin'
          },
          detail: 'removed via moderation'
        });
      }
      break;
    }
    case 'answer': {
      const t = await prisma.answer.findUnique({ where: { id } });
      if (!t) return res.status(404).json({ error: 'Answer not found' });
      await prisma.answer.update({ where: { id }, data: { status: 'REMOVED' } });
      break;
    }
    case 'comment': {
      const t = await prisma.comment.findUnique({ where: { id } });
      if (!t) return res.status(404).json({ error: 'Comment not found' });
      await prisma.comment.delete({ where: { id } });
      break;
    }
    case 'forum-topic': {
      const t = await prisma.forumTopic.findUnique({ where: { id } });
      if (!t) return res.status(404).json({ error: 'Topic not found' });
      await prisma.forumTopic.update({ where: { id }, data: { status: 'REMOVED' } });
      break;
    }
    case 'forum-post': {
      const t = await prisma.forumPost.findUnique({ where: { id } });
      if (!t) return res.status(404).json({ error: 'Post not found' });
      await prisma.forumPost.update({ where: { id }, data: { status: 'REMOVED' } });
      break;
    }
    default:
      return res.status(400).json({ error: 'unknown kind' });
  }
  res.json({ ok: true });
});

export default router;
