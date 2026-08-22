import { Router } from 'express';
import { prisma } from '../../db/prisma';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

router.delete('/questions/:id', requireAdmin, async (req, res) => {
  const q = await prisma.question.findUnique({ where: { id: req.params.id } });
  if (!q) return res.status(404).json({ error: 'Question not found' });
  await prisma.question.update({ where: { id: q.id }, data: { status: 'REMOVED' } });
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

export default router;
