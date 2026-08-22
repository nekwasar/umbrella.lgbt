import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../../db/prisma';
import { requireUser } from '../../middleware/auth';
import { answerSchema, askQuestionSchema } from '../../validation/qa';
import { slugify, uniqueQuestionSlug } from '../../lib/slug';
import { serializeAnswer, serializeQuestion } from '../../lib/qa';

const router = Router();

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, try again later' }
});

// --- ask a question (requires account, auto-publishes) ---
router.post('/', writeLimiter, requireUser, async (req, res) => {
  const parsed = askQuestionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid question' });
  }

  const { title, bodyMd, topic } = parsed.data;
  const slug = await uniqueQuestionSlug(slugify(title));

  const question = await prisma.question.create({
    data: {
      userId: req.authUser!.id,
      title,
      slug,
      bodyMd,
      topic: topic?.trim() ? topic.trim() : null,
      status: 'PUBLISHED'
    }
  });

  res.status(201).json({ question: serializeQuestion(question) });
});

// --- answer a question (requires account, auto-publishes) ---
router.post('/:slug/answers', writeLimiter, requireUser, async (req, res) => {
  const parsed = answerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid answer' });
  }

  const question = await prisma.question.findUnique({ where: { slug: req.params.slug } });
  if (!question || question.status !== 'PUBLISHED') {
    return res.status(404).json({ error: 'Question not found' });
  }

  const answer = await prisma.answer.create({
    data: {
      questionId: question.id,
      userId: req.authUser!.id,
      bodyMd: parsed.data.bodyMd,
      status: 'PUBLISHED'
    },
    include: { user: { select: { id: true, username: true, displayName: true } } }
  });

  res.status(201).json({ answer: serializeAnswer(answer) });
});

export default router;
