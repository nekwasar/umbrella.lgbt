import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { requireAdmin } from '../../middleware/auth';
import { embedQuestion } from '../../lib/search';
import { logQuestionAction } from '../../lib/question-log';
import { slugify, uniqueQuestionSlug } from '../../lib/slug';

const router = Router();

// Admin actor for the audit log (admins live in their own table, not User).
function adminActor(req: Parameters<typeof requireAdmin>[0]) {
  return {
    id: req.authAdmin?.id ?? null,
    name: req.authAdmin?.username ?? null,
    kind: 'admin' as const
  };
}

// --- editable question fields (whitelist; unknown keys stripped) ---
const editQuestionSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(300)
    .refine((t) => !/[<>]/.test(t), 'Title cannot contain < or >')
    .optional(),
  bodyMd: z.string().max(100_000).optional(),
  topic: z.string().max(60).nullable().optional(),
  status: z.enum(['PENDING', 'PUBLISHED', 'REMOVED']).optional()
});

function parsePaging(req: { query: Record<string, unknown> }, def = 50, max = 100) {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const pageSize = Math.min(max, Math.max(1, parseInt(String(req.query.pageSize ?? String(def)), 10) || def));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

// --- list questions (full editable fields + filter facets) ---
router.get('/questions', requireAdmin, async (req, res) => {
  const { page, pageSize, skip, take } = parsePaging(req);
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const topic = typeof req.query.topic === 'string' ? req.query.topic.trim() : '';
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';

  const where: Prisma.QuestionWhereInput = {};
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { slug: { contains: q, mode: 'insensitive' } },
      { topic: { contains: q, mode: 'insensitive' } }
    ];
  }
  if (topic) where.topic = topic;
  if (status === 'PENDING' || status === 'PUBLISHED' || status === 'REMOVED') {
    where.status = status;
  }

  const [total, items, facets] = await Promise.all([
    prisma.question.count({ where }),
    prisma.question.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      skip,
      take,
      include: {
        user: { select: { username: true, displayName: true } },
        _count: { select: { answers: true, logs: true } }
      }
    }),
    prisma.question.groupBy({ by: ['topic'], _count: true, orderBy: { topic: 'asc' } })
  ]);

  res.json({
    total,
    page,
    pageSize,
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      bodyMd: item.bodyMd,
      topic: item.topic,
      status: item.status,
      viewCount: item.viewCount,
      bestAnswerId: item.bestAnswerId,
      author: item.user.username,
      answerCount: item._count.answers,
      logCount: item._count.logs,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    })),
    topics: facets.filter((f) => f.topic).map((f) => ({ topic: f.topic!, count: f._count }))
  });
});

// --- edit a question (title/body/topic/status), audit-logged + re-embedded ---
router.patch('/questions/:id', requireAdmin, async (req, res) => {
  const parsed = editQuestionSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid question' });
  }
  const input = parsed.data;
  if (
    input.title === undefined &&
    input.bodyMd === undefined &&
    input.topic === undefined &&
    input.status === undefined
  ) {
    return res.status(400).json({ error: 'No editable fields provided' });
  }

  const current = await prisma.question.findUnique({ where: { id: req.params.id } });
  if (!current) return res.status(404).json({ error: 'Question not found' });

  const data: Record<string, unknown> = {};
  const changes: string[] = [];
  let action: 'edited' | 'removed' | 'restored' = 'edited';

  if (input.title !== undefined && input.title !== current.title) {
    data.title = input.title;
    changes.push('title');
    // Keep existing URLs: only regenerate an untouched (auto-derived) slug.
    if (current.slug === slugify(current.title)) {
      const newSlug = await uniqueQuestionSlug(slugify(input.title));
      if (newSlug !== current.slug) {
        data.slug = newSlug;
        changes.push(`slug → ${newSlug}`);
      }
    }
  }
  if (input.bodyMd !== undefined && input.bodyMd !== current.bodyMd) {
    data.bodyMd = input.bodyMd;
    changes.push('body');
  }
  if (input.topic !== undefined) {
    const trimmed = (input.topic ?? '').trim();
    const nextTopic = trimmed ? trimmed : null;
    if (nextTopic !== current.topic) {
      data.topic = nextTopic;
      changes.push(`topic → ${nextTopic ?? 'none'}`);
    }
  }
  if (input.status !== undefined && input.status !== current.status) {
    data.status = input.status;
    changes.push(`status ${current.status} → ${input.status}`);
    if (current.status !== 'REMOVED' && input.status === 'REMOVED') action = 'removed';
    else if (current.status === 'REMOVED' && input.status !== 'REMOVED') action = 'restored';
  }

  if (changes.length === 0) {
    return res.json({ ok: true, changed: false, id: current.id });
  }

  const question = await prisma.question.update({ where: { id: current.id }, data });
  await embedQuestion(question.id); // searchIndex is a generated column (auto); vec needs refresh
  await logQuestionAction({
    questionId: question.id,
    action,
    actor: adminActor(req),
    detail: changes.join(', ')
  });

  res.json({ ok: true, changed: true, id: question.id, action });
});

// --- audit log (newest first, joined with question title + actor) ---
router.get('/logs', requireAdmin, async (req, res) => {
  const { page, pageSize, skip, take } = parsePaging(req, 50, 200);
  const questionId = typeof req.query.questionId === 'string' ? req.query.questionId : '';

  const where = questionId ? { questionId } : {};
  const [total, items] = await Promise.all([
    prisma.questionLog.count({ where }),
    prisma.questionLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        question: { select: { title: true, slug: true } },
        // No FK on actor — just resolve the actor name if they still exist.
      }
    })
  ]);

  res.json({
    total,
    page,
    pageSize,
    items: items.map((item) => ({
      id: item.id,
      questionId: item.questionId,
      questionTitle: item.question.title,
      questionSlug: item.question.slug,
      action: item.action,
      detail: item.detail,
      actorId: item.actorId,
      actorName: item.actorName,
      actorKind: item.actorKind,
      createdAt: item.createdAt.toISOString()
    }))
  });
});

router.delete('/questions/:id', requireAdmin, async (req, res) => {
  const q = await prisma.question.findUnique({ where: { id: req.params.id } });
  if (!q) return res.status(404).json({ error: 'Question not found' });
  if (q.status !== 'REMOVED') {
    await prisma.question.update({ where: { id: q.id }, data: { status: 'REMOVED' } });
    await logQuestionAction({
      questionId: q.id,
      action: 'removed',
      actor: adminActor(req),
      detail: 'removed via moderation'
    });
  }
  res.json({ ok: true });
});

router.delete('/answers/:id', requireAdmin, async (req, res) => {
  const a = await prisma.answer.findUnique({ where: { id: req.params.id } });
  if (!a) return res.status(404).json({ error: 'Answer not found' });
  await prisma.answer.update({ where: { id: a.id }, data: { status: 'REMOVED' } });
  res.json({ ok: true });
});

router.delete('/comments/:id', requireAdmin, async (req, res) => {
  const c = await prisma.comment.findUnique({ where: { id: req.params.id } });
  if (!c) return res.status(404).json({ error: 'Comment not found' });
  await prisma.comment.delete({ where: { id: c.id } });
  res.json({ ok: true });
});

router.delete('/forum/topics/:id', requireAdmin, async (req, res) => {
  const t = await prisma.forumTopic.findUnique({ where: { id: req.params.id } });
  if (!t) return res.status(404).json({ error: 'Topic not found' });
  await prisma.forumTopic.update({ where: { id: t.id }, data: { status: 'REMOVED' } });
  res.json({ ok: true });
});

router.delete('/forum/posts/:id', requireAdmin, async (req, res) => {
  const p = await prisma.forumPost.findUnique({ where: { id: req.params.id } });
  if (!p) return res.status(404).json({ error: 'Post not found' });
  await prisma.forumPost.update({ where: { id: p.id }, data: { status: 'REMOVED' } });
  res.json({ ok: true });
});

export default router;
