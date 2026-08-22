import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { verifyPassword } from '../../lib/password';
import { signToken } from '../../lib/jwt';
import { ADMIN_COOKIE, clearAuthCookie, setAuthCookie } from '../../lib/cookies';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200)
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, try again later' }
});

router.post('/login', loginLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid username or password' });
  }

  const { username, password } = parsed.data;
  const admin = await prisma.admin.findUnique({ where: { username } });
  if (!admin) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const valid = await verifyPassword(password, admin.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  await prisma.admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });

  const token = signToken({ sub: admin.id, kind: 'admin', username: admin.username });
  setAuthCookie(res, ADMIN_COOKIE, token);

  res.json({
    admin: { id: admin.id, username: admin.username, role: admin.role }
  });
});

router.post('/logout', (_req, res) => {
  clearAuthCookie(res, ADMIN_COOKIE);
  res.json({ ok: true });
});

router.get('/me', requireAdmin, (req, res) => {
  res.json({ admin: req.authAdmin });
});

export default router;
