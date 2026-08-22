import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../../db/prisma';
import { requireAdmin, requireSuperAdmin } from '../../middleware/auth';
import { hashPassword, verifyPassword } from '../../lib/password';
import { changePasswordSchema, changeRoleSchema, createAdminSchema } from '../../validation/admin';

const router = Router();

function serialize(a: {
  id: string;
  username: string;
  role: string;
  createdAt: Date;
  lastLoginAt: Date | null;
}) {
  return {
    id: a.id,
    username: a.username,
    role: a.role,
    createdAt: a.createdAt.toISOString(),
    lastLoginAt: a.lastLoginAt ? a.lastLoginAt.toISOString() : null
  };
}

const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, try again later' }
});

router.get('/', requireAdmin, async (_req, res) => {
  const admins = await prisma.admin.findMany({ orderBy: { createdAt: 'asc' } });
  res.json({ admins: admins.map(serialize) });
});

router.post('/', requireAdmin, requireSuperAdmin, createLimiter, async (req, res) => {
  const parsed = createAdminSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input' });
  }
  const { username, password, role } = parsed.data;
  const existing = await prisma.admin.findUnique({ where: { username } });
  if (existing) {
    return res.status(409).json({ error: 'An admin with that username already exists' });
  }
  const admin = await prisma.admin.create({
    data: { username, passwordHash: await hashPassword(password), role: role ?? 'ADMIN' }
  });
  res.status(201).json({ admin: serialize(admin) });
});

router.delete('/:id', requireAdmin, requireSuperAdmin, async (req, res) => {
  const target = await prisma.admin.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: 'Admin not found' });
  if (target.id === req.authAdmin!.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }
  if (target.role === 'SUPER_ADMIN') {
    const superCount = await prisma.admin.count({ where: { role: 'SUPER_ADMIN' } });
    if (superCount <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last super admin' });
    }
  }
  await prisma.admin.delete({ where: { id: target.id } });
  res.json({ ok: true });
});

router.patch('/:id/password', requireAdmin, async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input' });
  }
  const target = await prisma.admin.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: 'Admin not found' });

  const isSelf = target.id === req.authAdmin!.id;
  const isSuper = req.authAdmin!.role === 'SUPER_ADMIN';
  if (!isSelf && !isSuper) {
    return res.status(403).json({ error: 'Not allowed' });
  }

  if (isSelf) {
    if (!parsed.data.currentPassword) {
      return res.status(400).json({ error: 'Current password is required' });
    }
    const ok = await verifyPassword(parsed.data.currentPassword, target.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
  }

  await prisma.admin.update({
    where: { id: target.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) }
  });
  res.json({ ok: true });
});

router.patch('/:id/role', requireAdmin, requireSuperAdmin, async (req, res) => {
  const parsed = changeRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input' });
  }
  const target = await prisma.admin.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: 'Admin not found' });

  if (target.id === req.authAdmin!.id && parsed.data.role !== 'SUPER_ADMIN') {
    const superCount = await prisma.admin.count({ where: { role: 'SUPER_ADMIN' } });
    if (superCount <= 1) {
      return res.status(400).json({ error: 'Cannot demote the last super admin' });
    }
  }

  await prisma.admin.update({ where: { id: target.id }, data: { role: parsed.data.role } });
  res.json({ ok: true });
});

export default router;
