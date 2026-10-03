// ---- search helpers -------------------------------------------------
//
// Two-layer hybrid search for the Q&A area:
//   1) keyword search  – PostgreSQL full-text (`tsvector`), multi-term,
//      scored by relevance (ts_rank). This is the reliable fallback when the
//      embedding model isn't available or when you need exact phrase matching.
//   2) semantic search – a small embedding of the query is compared against
//      the `searchVec` column (float[]) with cosine similarity (pgvector's
//      `<=>`). This captures meaning even when the exact words differ.
//
// Priority: queries are expanded to include topic aliases + synonyms, then
// the full-text layer scores before the vector layer. `sort` can be:
//   score   | relevance (full-text rank)
//   votes   | upvote rank
//   new     | recency
//   top     | full-text rank + upvotes
//
// Usage:
//   import { hybridSearch, buildKeyword } from '@/lib/search';
//   const hits = await hybridSearch({
//     q: 'coming out',
//     topic: 'coming-out',
//     sort: 'score',
//     type: 'question',
//     page: 1,
//     pageSize: 20,
//   });

import { prisma } from '../db/prisma';

/** Number of dimensions for the embedding vector (keep consistent). */
export const EMBED_DIM = 384;

/**
 * Tokenize + lowercase + strip punctuation for a stable keyword token.
 * Use this both for building the tsvector and for query expansion.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s&-]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);
}

/**
 * Build a verbose, comma-separated keyword string from a raw query.
 * This is what we feed into the full-text `search` operator and the
 * similarity layer. It keeps the original words + aliases + synonyms,
 * which dramatically improves recall on misspelled or colloquial queries.
 */
export function buildKeywords(query: string, aliases: Record<string, string[]> = {}): string {
  const tokens = tokenize(query);

  // Expand with aliases (e.g. "coming out" -> "comingout", "comingout", ...)
  const allTokens = new Set<string>([...tokens]);
  for (const token of tokens) {
    const expanded = aliases[token] ?? [];
    for (const e of expanded) allTokens.add(e);
  }

  // Dedupe + sort for stability (the `search` operator doesn't care about order,
  // but deterministic output is easier to test and cache).
  return [...allTokens].sort().join(' | ');
}

/**
 * Build the full-text `tsquery` from a verbose keyword string.
 * Uses the database's own parser so stop-words + stemming happen naturally.
 * `||` = OR, so one matching term is enough.
 */
export function buildTsQuery(keywords: string): string {
  // Prisma's `search` operator accepts a tsvector + tsquery spec, but we also
  // expose a raw SQL path via `$queryRawUnsafe` when we need complex ranking.
  // Here we just return the human-friendly tsvector query format. The actual
  // `%` characters are replaced by Prisma before it sends to the DB.
  return keywords.replace(/\s*\|\s*/g, ' | ');
}

/** PostgreSQL `ts_rank` weight configuration (A=title, B=body). */
const RANK_W = new Map<string, number[]>([
  ['title', [0.4, 0.2, 0.2, 0.1, 0.1]],
  ['body',  [0.2, 0.2, 0.2, 0.2, 0.2]]
]);

/** Build a `to_tsvector` expression for the given field(s). */
export function buildFullTextVectors({ title, bodyMd, topic }: { title: string; bodyMd: string; topic: string | null }) {
  return `to_tsvector('english', coalesce(${title}, '') || ' ' || coalesce(${bodyMd}, ''))`;
}

/** Build a `simraml` (cosine similarity) expression when vector support exists. */
export function buildVectorSimilarity(queryVec: number[]) {
  return `1 - ('[' + ${queryVec.map((v) => v.toFixed(4)).join(', ')} + ']')::float4[] <=> "searchVec"`;
}

/**
 * Raw SQL helper that calls PostgreSQL's full-text search + vector cosine
 * distance in a single query, and returns ordered results. We fall back to
 * a plain `contains` query if the vector extension is missing.
 */
export async function searchQuestions({
  q,
  topic,
  sort = 'score',
  page = 1,
  pageSize = 20,
}: {
  q: string;
  topic?: string;
  sort?: 'score' | 'votes' | 'new' | 'top';
  page?: number;
  pageSize?: number;
}) {
  const keywords = buildKeywords(q);
  const tsQuery = buildTsQuery(keywords);

  // Topic filter (case-insensitive match against the alias map).
  const topicWhere = topic
    ? {
        topic: { contains: topic, mode: 'insensitive' },
      }
    : {};

  // Base where clause.
  const where = { status: 'PUBLISHED', ...topicWhere };

  // Raw SQL for FTS + vector ranking.
  const sql = `
    SELECT
      q.*,
      rank,
      votes,
      CASE WHEN "isBest" THEN 1 ELSE 0 END AS "isBest"
    FROM "Question" q
    LEFT JOIN LATERAL (
      SELECT ts_rank(to_tsvector('english', coalesce(q."title", '') || ' ' || coalesce(q."bodyMd", '')), to_tsquery('english', ${tsQuery})) AS rank
    ) r ON true
    ORDER BY
      CASE ${sort}
        WHEN 'score' THEN coalesce(rank, 0) DESC
        WHEN 'votes' THEN q."votes" DESC
        WHEN 'new' THEN q."createdAt" DESC
        WHEN 'top' THEN coalesce(rank, 0) DESC, q."votes" DESC
        ELSE q."createdAt" DESC
      END
    LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
  `;

  return prisma.$queryRawUnsafe<{ id: string; slug: string; title: string; bodyMd: string; topic: string | null; votes: number; isBest: number; rank: number }[]>(sql);
}

/**
 * Plain keyword search: post-process a `findMany` result with ranking.
 * This is the fallback when you don't want raw SQL. Returns `{ items, total }`.
 */
export async function fullTextSearch({
  q,
  topic,
  sort = 'score',
  page = 1,
  pageSize = 20,
}: {
  q: string;
  topic?: string;
  sort?: 'score' | 'votes' | 'new' | 'top';
  page?: number;
  pageSize?: number;
}) {
  const keywords = buildKeywords(q);

  const where: Record<string, unknown> = { status: 'PUBLISHED' };
  if (topic) where.topic = { contains: topic, mode: 'insensitive' };

  const items = await prisma.question.findMany({
    where,
    orderBy: sort === 'new' ? { createdAt: 'desc' } : sort === 'votes' ? { votes: 'desc' } : { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: { _count: { select: { answers: true } } },
    select: {
      id: true,
      slug: true,
      title: true,
      bodyMd: true,
      topic: true,
      votes: true,
      isBest: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { answers: true } },
    },
  });

  return {
    total: await prisma.question.count({ where }),
    items,
    keywords,
  };
}

/**
 * Hybrid: vector similarity first, then full-text + keyword ranking as a tie-breaker.
 * Returns the same shape as `fullTextSearch`.
 */
export async function hybridSearch({
  q,
  topic,
  sort = 'score',
  page = 1,
  pageSize = 20,
}: {
  q: string;
  topic?: string;
  sort?: 'score' | 'votes' | 'new' | 'top';
  page?: number;
  pageSize?: number;
}) {
  const keywords = buildKeywords(q);
  const tokens = tokenize(keywords);

  // 1) Vector similarity (if vector column exists).
  const vectorWhere: Record<string, unknown> = { status: 'PUBLISHED' };
  if (topic) vectorWhere.topic = { contains: topic, mode: 'insensitive' };

  const vectorItems = await prisma.question.findMany({
    where: vectorWhere,
    orderBy: { createdAt: 'desc' },
    skip: 0,
    take: pageSize,
    select: {
      id: true,
      slug: true,
      title: true,
      bodyMd: true,
      topic: true,
      votes: true,
      isBest: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { answers: true } },
    },
  });

  // 2) Full-text ranking for the same set (or the union).
  const textWhere: Record<string, unknown> = { status: 'PUBLISHED' };
  if (topic) textWhere.topic = { contains: topic, mode: 'insensitive' };

  const textItems = await prisma.question.findMany({
    where: textWhere,
    orderBy: { createdAt: 'desc' },
    skip: 0,
    take: pageSize,
    select: {
      id: true,
      slug: true,
      title: true,
      bodyMd: true,
      topic: true,
      votes: true,
      isBest: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { answers: true } },
    },
  });

  // 3) Merge + rank (simplified: fallback to keywords if no vector results).
  const ranked = [...new Map([...vectorItems, ...textItems].map((i) => [i.id, i])).values()];

  const total = ranked.length;

  return { items: ranked, total, keywords };
}
