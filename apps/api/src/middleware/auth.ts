import { NextFunction, Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { ADMIN_COOKIE, USER_COOKIE } from '../lib/cookies';
import { TokenPayload, verifyToken } from '../lib/jwt';

function extractToken(req: Request, cookieName: string): string | null {
  const token = req.cookies?.[cookieName];
  return typeof token === 'string' && token.length > 0 ? token : null;
}

function unauthorized(res: Response): void {
  res.status(401).json({ error: 'Not authenticated' });
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req, ADMIN_COOKIE);
  if (!token) return unauthorized(res);

  let payload: TokenPayload;
  try {
    payload = verifyToken(token);
  } catch {
    return unauthorized(res);
  }
  if (payload.kind !== 'admin') return unauthorized(res);

  const admin = await prisma.admin.findUnique({ where: { id: payload.sub } });
  if (!admin) return unauthorized(res);

  req.authAdmin = { id: admin.id, username: admin.username, role: admin.role };
  next();
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.authAdmin?.role !== 'SUPER_ADMIN') {
    res.status(403).json({ error: 'Super admin privileges required' });
    return;
  }
  next();
}

export async function requireUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req, USER_COOKIE);
  if (!token) return unauthorized(res);

  let payload: TokenPayload;
  try {
    payload = verifyToken(token);
  } catch {
    return unauthorized(res);
  }
  if (payload.kind !== 'user') return unauthorized(res);

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) return unauthorized(res);
  if (user.isBanned) {
    res.status(403).json({ error: 'Account is banned' });
    return;
  }

  req.authUser = { id: user.id, username: user.username };
  next();
}

export async function optionalUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req, USER_COOKIE);
  if (token) {
    try {
      const payload = verifyToken(token);
      if (payload.kind === 'user') {
        const user = await prisma.user.findUnique({ where: { id: payload.sub } });
        if (user && !user.isBanned) {
          req.authUser = { id: user.id, username: user.username };
        }
      }
    } catch {
      // ignore invalid token; treat as anonymous
    }
  }
  next();
}

export async function optionalAdmin(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req, ADMIN_COOKIE);
  if (token) {
    try {
      const payload = verifyToken(token);
      if (payload.kind === 'admin') {
        const admin = await prisma.admin.findUnique({ where: { id: payload.sub } });
        if (admin) {
          req.authAdmin = { id: admin.id, username: admin.username, role: admin.role };
        }
      }
    } catch {
      // ignore invalid token; treat as anonymous
    }
  }
  next();
}
