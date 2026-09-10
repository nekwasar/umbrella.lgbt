import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../db/prisma';
import { requireUser } from '../middleware/auth';
import { reportSchema } from '../validation/forum';

const router = Router();

const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, try again later' }
});

/** POST /api/reports — file a content report (auth). Reactive moderation queue for admins. */
router.post('/', reportLimiter, requireUser, async (req, res) => {
  const parsed = reportSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid report' });
  }
  const { targetType, targetId, reason } = parsed.data;

  // Target must exist (prevents junk rows).
  const exists =
    targetType === 'QUESTION'
      ? await prisma.question.findUnique({ where: { id: targetId } })
      : targetType === 'ANSWER'
        ? await prisma.answer.findUnique({ where: { id: targetId } })
        : targetType === 'COMMENT'
          ? await prisma.comment.findUnique({ where: { id: targetId } })
          : targetType === 'USER'
            ? await prisma.user.findUnique({ where: { id: targetId } })
            : targetType === 'PAGE'
              ? await prisma.page.findUnique({ where: { id: targetId } })
              : targetType === 'FORUM_TOPIC'
                ? await prisma.forumTopic.findUnique({ where: { id: targetId } })
                : await prisma.forumPost.findUnique({ where: { id: targetId } });
  if (!exists) return res.status(404).json({ error: 'Reported content not found' });

  const report = await prisma.report.create({
    data: {
      targetType: targetType as any,
      targetId,
      reporterId: req.authUser!.id,
      reason: reason.trim(),
      status: 'PENDING'
    }
  });
  res.status(201).json({ report: { id: report.id, status: report.status } });
});

export default router;
