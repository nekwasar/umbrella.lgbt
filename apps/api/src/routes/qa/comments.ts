import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../../db/prisma';
import { optionalUser, requireUser } from '../../middleware/auth';
import { commentSchema } from '../../validation/qa';
import { serializeComment } from '../../lib/qa';

const router = Router();

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, try again later' }
});

/**
 * Post a comment.
 * - Top-level comment (no parentId): requires a logged-in user.
 * - Reply (parentId set): anyone may reply, including anonymous users
 *   (anonymous replies must supply an authorName). All auto-publish.
 */
router.post('/', writeLimiter, optionalUser, async (req, res) => {
  const parsed = commentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid comment' });
  }

  const { targetType, targetId, parentId, bodyMd, authorName } = parsed.data;
  const include = { user: { select: { id: true, username: true, displayName: true } } };

  if (parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: parentId } });
    if (!parent) return res.status(404).json({ error: 'Parent comment not found' });

    const userId = req.authUser?.id ?? null;
    if (!userId && !(authorName && authorName.trim())) {
      return res.status(400).json({ error: 'Please enter a name to reply' });
    }

    const comment = await prisma.comment.create({
      data: {
        targetType: parent.targetType,
        targetId: parent.targetId,
        parentId: parent.id,
        userId,
        authorName: userId ? null : authorName?.trim() || null,
        bodyMd,
        status: 'PUBLISHED'
      },
      include
    });
    return res.status(201).json({ comment: serializeComment(comment) });
  }

  if (!req.authUser) {
    return res.status(401).json({ error: 'Sign in to comment' });
  }

  if (targetType === 'QUESTION') {
    const q = await prisma.question.findUnique({ where: { id: targetId } });
    if (!q) return res.status(404).json({ error: 'Question not found' });
  } else {
    const a = await prisma.answer.findUnique({ where: { id: targetId } });
    if (!a) return res.status(404).json({ error: 'Answer not found' });
  }

  const comment = await prisma.comment.create({
    data: {
      targetType,
      targetId,
      parentId: null,
      userId: req.authUser.id,
      authorName: null,
      bodyMd,
      status: 'PUBLISHED'
    },
    include
  });

  res.status(201).json({ comment: serializeComment(comment) });
});

export default router;
