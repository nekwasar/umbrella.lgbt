import { prisma } from '../db/prisma';

/** Lowercase + collapse whitespace + cap length, so "How  Do   I?" dedupes. */
export function normalizeSearchQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase().slice(0, 200);
}

/**
 * Record a Q&A search (deduplicated). `results === 0` bumps `zeros` — the
 * "asked, found nothing" counter that feeds content/training workflows.
 * Never throws: a logging failure must not affect search results.
 */
export async function recordSearchQuery(
  raw: string,
  results: number,
  userId?: string | null
): Promise<void> {
  const query = normalizeSearchQuery(raw);
  if (query.length < 2) return;
  try {
    await prisma.searchQueryLog.upsert({
      where: { query },
      create: {
        query,
        hits: 1,
        zeros: results === 0 ? 1 : 0,
        lastResults: results,
        userId: userId ?? null
      },
      update: {
        hits: { increment: 1 },
        zeros: { increment: results === 0 ? 1 : 0 },
        lastResults: results,
        ...(userId ? { userId } : {})
      }
    });
  } catch (err) {
    console.warn('[search-log] failed to record query:', (err as Error).message);
  }
}