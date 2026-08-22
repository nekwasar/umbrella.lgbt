import { prisma } from '../db/prisma';

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 150);
}

/** Ensure a unique question slug by appending -2, -3, … on collision. */
export async function uniqueQuestionSlug(base: string): Promise<string> {
  let slug = base || 'question';
  let suffix = 2;
  while (await prisma.question.findUnique({ where: { slug } })) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
}
