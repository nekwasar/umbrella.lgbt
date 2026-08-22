import { prisma } from '../db/prisma';
import { config } from '../config';
import { hashPassword } from './password';

/**
 * Idempotent: seeds the super admin from env (SUPERADMIN_USERNAME / SUPERADMIN_PASSWORD)
 * if no admin with that username exists yet.
 */
export async function ensureSuperAdmin(): Promise<void> {
  const { username, password } = config.superAdmin;
  if (!password) {
    throw new Error('SUPERADMIN_PASSWORD is required');
  }

  const existing = await prisma.admin.findUnique({ where: { username } });
  if (existing) {
    return;
  }

  const passwordHash = await hashPassword(password);
  await prisma.admin.create({
    data: { username, passwordHash, role: 'SUPER_ADMIN' }
  });
  console.log(`[superadmin] seeded admin '${username}' (SUPER_ADMIN)`);
}
