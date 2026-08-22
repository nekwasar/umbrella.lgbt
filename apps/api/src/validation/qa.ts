import { z } from 'zod';

export const askQuestionSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(300),
  bodyMd: z.string().max(100_000).optional().default(''),
  topic: z.string().max(60).optional()
});

export const answerSchema = z.object({
  bodyMd: z.string().min(1, 'Answer cannot be empty').max(100_000)
});

export const voteSchema = z.object({
  value: z.union([z.literal(-1), z.literal(0), z.literal(1)])
});

export const pinSchema = z.object({
  isBest: z.boolean()
});

export const commentSchema = z.object({
  targetType: z.enum(['QUESTION', 'ANSWER']),
  targetId: z.string().min(1),
  parentId: z.string().min(1).optional(),
  bodyMd: z.string().min(1, 'Comment cannot be empty').max(20_000),
  authorName: z.string().min(1).max(60).optional()
});
