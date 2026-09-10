import { z } from 'zod';

export const forumTopicSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(150),
  bodyMd: z.string().min(1, 'Opening post cannot be empty').max(100_000)
});

export const forumPostSchema = z.object({
  bodyMd: z.string().min(1, 'Post cannot be empty').max(100_000)
});

export const reportSchema = z.object({
  targetType: z.enum(['QUESTION', 'ANSWER', 'COMMENT', 'USER', 'PAGE', 'FORUM_TOPIC', 'FORUM_POST']),
  targetId: z.string().min(1),
  reason: z.string().min(5, 'Please describe the problem (min 5 characters)').max(500)
});
