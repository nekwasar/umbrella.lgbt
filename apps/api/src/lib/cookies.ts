import type { Response } from 'express';
import { config } from '../config';

export const ADMIN_COOKIE = 'umbrella_admin';
export const USER_COOKIE = 'umbrella_user';

/** Matches the default JWT_EXPIRES_IN=7d */
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

const baseOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: config.isProd,
  path: '/'
};

export function setAuthCookie(res: Response, name: string, token: string): void {
  res.cookie(name, token, { ...baseOptions, maxAge: MAX_AGE_SECONDS * 1000 });
}

export function clearAuthCookie(res: Response, name: string): void {
  res.clearCookie(name, { ...baseOptions });
}
