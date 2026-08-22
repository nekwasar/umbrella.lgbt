import { z } from 'zod';

export const createAdminSchema = z.object({
  username: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers and underscores'),
  password: z.string().min(10).max(200),
  role: z.enum(['SUPER_ADMIN', 'ADMIN']).optional()
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200).optional(),
  newPassword: z.string().min(10).max(200)
});

export const changeRoleSchema = z.object({
  role: z.enum(['SUPER_ADMIN', 'ADMIN'])
});
