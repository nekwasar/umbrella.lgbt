import { Page } from '@prisma/client';
import { prisma } from '../db/prisma';
import { PageType } from '../validation/page';

/**
 * Related posts: manual relations first (page_relations), then auto-suggest
 * by shared topic/category within the same type, then fall back to same-type
 * recently updated pages. Returns published pages only.
 */
export async function getRelatedPages(
  pageId: string,
  type: PageType,
  topic: string | null,
  category: string | null,
  count = 6
): Promise<Page[]> {
  const manual = await prisma.pageRelation.findMany({
    where: { pageId },
    include: { related: true }
  });

  const related: Page[] = [];
  const seen = new Set<string>([pageId]);

  for (const r of manual) {
    if (r.related.status !== 'PUBLISHED') continue;
    if (seen.has(r.related.id)) continue;
    seen.add(r.related.id);
    related.push(r.related);
    if (related.length >= count) break;
  }

  if (related.length < count) {
    const conditions = [];
    if (topic) conditions.push({ topic });
    if (category) conditions.push({ category });
    if (conditions.length > 0) {
      const auto = await prisma.page.findMany({
        where: {
          type,
          status: 'PUBLISHED',
          id: { notIn: [...seen] },
          OR: conditions
        },
        take: count - related.length,
        orderBy: { updatedAt: 'desc' }
      });
      for (const p of auto) {
        seen.add(p.id);
        related.push(p);
      }
    }
  }

  if (related.length < count) {
    const fallback = await prisma.page.findMany({
      where: {
        type,
        status: 'PUBLISHED',
        id: { notIn: [...seen] }
      },
      take: count - related.length,
      orderBy: { updatedAt: 'desc' }
    });
    for (const p of fallback) {
      seen.add(p.id);
      related.push(p);
    }
  }

  return related.slice(0, count);
}
