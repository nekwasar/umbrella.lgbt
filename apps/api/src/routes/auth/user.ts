import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { hashPassword, verifyPassword } from '../../lib/password';
import { signToken } from '../../lib/jwt';
import { clearAuthCookie, setAuthCookie, USER_COOKIE } from '../../lib/cookies';
import { requireUser } from '../../middleware/auth';

const router = Router();

const registerSchema = z.object({
  username: z
    .string()
    .min(2)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers and underscores'),
  password: z.string().min(8).max(200),
  email: z.string().email().optional().or(z.literal('')),
  displayName: z.string().max(60).optional(),
  pronouns: z.string().max(40).optional()
});

const loginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200)
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, try again later' }
});

function publicUser(user: { id: string; username: string; displayName: string | null; pronouns: string | null }) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    pronouns: user.pronouns
  };
}

router.post('/register', authLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input' });
  }

  const { username, password, email, displayName, pronouns } = parsed.data;
  const passwordHash = await hashPassword(password);

  let user;
  try {
    user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        email: email || null,
        displayName: displayName || null,
        pronouns: pronouns || null
      }
    });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002') {
      return res.status(409).json({ error: 'Username or email already taken' });
    }
    throw err;
  }

  const token = signToken({ sub: user.id, kind: 'user', username: user.username });
  setAuthCookie(res, USER_COOKIE, token);

  res.status(201).json({ user: publicUser(user) });
});

router.post('/login', authLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid username or password' });
  }

  const { username, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  if (user.isBanned) {
    return res.status(403).json({ error: 'Account is banned' });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const token = signToken({ sub: user.id, kind: 'user', username: user.username });
  setAuthCookie(res, USER_COOKIE, token);

  res.json({ user: publicUser(user) });
});

router.post('/logout', (_req, res) => {
  clearAuthCookie(res, USER_COOKIE);
  res.json({ ok: true });
});

router.get('/me', requireUser, (req, res) => {
  res.json({ user: req.authUser });
});

export default router;
