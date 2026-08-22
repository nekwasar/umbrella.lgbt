import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../../db/prisma';
import { optionalAdmin, optionalUser, requireUser } from '../../middleware/auth';
import { pinSchema, voteSchema } from '../../validation/qa';

const router = Router();

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, try again later' }
});

/** Toggle vote: same value removes it; 0 removes it; otherwise set/change it. */
router.post('/:id/vote', writeLimiter, requireUser, async (req, res) => {
  const parsed = voteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid vote' });
  }

  const answer = await prisma.answer.findUnique({ where: { id: req.params.id } });
  if (!answer) return res.status(404).json({ error: 'Answer not found' });

  const userId = req.authUser!.id;
  const existing = await prisma.answerVote.findUnique({
    where: { answerId_userId: { answerId: answer.id, userId } }
  });

  const want = parsed.data.value;
  let newValue: number | null;

  if (want === 0 || (existing && existing.value === want)) {
    if (existing) await prisma.answerVote.delete({ where: { id: existing.id } });
    newValue = null;
  } else if (existing) {
    await prisma.answerVote.update({ where: { id: existing.id }, data: { value: want } });
    newValue = want;
  } else {
    await prisma.answerVote.create({ data: { answerId: answer.id, userId, value: want } });
    newValue = want;
  }

  const agg = await prisma.answerVote.aggregate({
    where: { answerId: answer.id },
    _sum: { value: true }
  });
  const votes = agg._sum.value ?? 0;
  await prisma.answer.update({ where: { id: answer.id }, data: { votes } });

  res.json({ votes, userVote: newValue });
});

/** Pin/unpin the best answer — question author or admin. */
router.post('/:id/pin', writeLimiter, optionalUser, optionalAdmin, async (req, res) => {
  const parsed = pinSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input' });
  }

  const answer = await prisma.answer.findUnique({
    where: { id: req.params.id },
    include: { question: { select: { id: true, userId: true } } }
  });
  if (!answer) return res.status(404).json({ error: 'Answer not found' });

  const isAdmin = !!req.authAdmin;
  const isAuthor = !!req.authUser && answer.question.userId === req.authUser.id;
  if (!isAdmin && !isAuthor) {
    return res.status(403).json({ error: 'Only the question author or an admin can pin an answer' });
  }

  await prisma.$transaction([
    prisma.answer.updateMany({
      where: { questionId: answer.questionId, id: { not: answer.id } },
      data: { isBest: false }
    }),
    prisma.answer.update({ where: { id: answer.id }, data: { isBest: parsed.data.isBest } }),
    prisma.question.update({
      where: { id: answer.questionId },
      data: { bestAnswerId: parsed.data.isBest ? answer.id : null }
    })
  ]);

  res.json({ ok: true, isBest: parsed.data.isBest });
});

export default router;
