// ---- search helpers -------------------------------------------------
//
// Two-layer hybrid search for the Q&A area:
//   1) keyword search — PostgreSQL full-text over the GENERATED
//      `searchIndex` tsvector column, scored by `ts_rank`
//      (`searchQuestions()`). Reliable for exact/multi-term queries.
//   2) semantic search — cosine against the stored hashing embedding
//      (`searchVec`, computed in JS with `embedText`/`cosine`, no pgvector
//      required), falling back to in-process TF-IDF (`rankSimilar`) for
//      rows that have not been reindexed yet.
//
// `hybridSearch()` blends both: candidates come from keyword matching
// (falling back to the recent corpus when a paraphrase query matches no
// keywords), the FTS rank and TF-IDF cosine are normalized and weighted,
// then the list is paginated. `sort` can be:
//   score   | blended relevance (default)
//   votes   | answer upvotes
//   new     | recency
//   top     | blended relevance, votes as tie-breaker
//
// Usage (e.g. from `routes/qa/read.ts` with `?engine=hybrid`):
//   import { hybridSearch } from '@/lib/search';
//   const hits = await hybridSearch({
//     q: 'coming out',
//     topic: 'coming-out',
//     sort: 'score',
//     page: 1,
//     pageSize: 20,
//   });
//
// `searchVec` maintenance: written on every Q&A create
// (`embedQuestion`/`embedAnswer`, wired in `routes/qa/write.ts`); backfill
// the whole corpus with `npm run reindex:search`.

import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import {
  CorpusDoc,
  EMBED_DIM,
  STOP_WORDS,
  cosine,
  embedText,
  rankSimilar,
} from './embedding';

export { EMBED_DIM };

/** How many candidates each layer may contribute to a blended query. */
const CANDIDATE_CAP = 200;

export type SearchSort = 'score' | 'votes' | 'new' | 'top';

export interface SearchQuestionRow {
  id: string;
  slug: string;
  title: string;
  bodyMd: string;
  topic: string | null;
  votes: number;
  isBest: number;
  rank: number;
}

export interface SearchQuestionItem {
  id: string;
  slug: string;
  title: string;
  bodyMd: string;
  topic: string | null;
  viewCount: number;
  votes: number;
  isBest: boolean;
  answerCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tokenize + lowercase + strip punctuation for stable keyword tokens.
 * Used both for building the tsquery and for keyword candidate matching.
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
 * Build a verbose, sorted keyword string from a raw query (tokens only —
 * alias expansion can be added later via the `aliases` argument).
 */
export function buildKeywords(query: string, aliases: Record<string, string[]> = {}): string {
  const tokens = tokenize(query);
  const allTokens = new Set<string>(tokens);
  for (const token of tokens) {
    for (const e of aliases[token] ?? []) allTokens.add(e);
  }
  return [...allTokens].sort().join(' | ');
}

/**
 * Turn a keyword string into a safe Postgres `tsquery` spec: every term is
 * reduced to [a-z0-9]+ (so `-`, `&`, `!`, `(`, `)` can never break the
 * parser) and terms are OR-ed. Returns '' when nothing survives — callers
 * must treat that as "no query" (`to_tsquery('')` errors).
 */
export function buildTsQuery(keywords: string): string {
  return keywords
    .split('|')
    .map((t) => t.replace(/[^a-z0-9]/g, ''))
    .filter(Boolean)
    .join(' | ');
}

/** Raw, de-duplicated, stop-word-free terms for Prisma `contains` filters. */
function contentTerms(query: string): string[] {
  return [...new Set(tokenize(query).filter((t) => !STOP_WORDS.has(t)))];
}

/** Whitelisted ORDER BY fragments (static SQL only — never user input). */
const ORDER_SQL: Record<SearchSort, string> = {
  score: 'coalesce(r.rank, 0) DESC',
  votes: 'votes DESC',
  new: 'q."createdAt" DESC',
  top: 'coalesce(r.rank, 0) DESC, votes DESC',
};

function clampPage(page: number, pageSize: number): { take: number; offset: number } {
  const take = Math.min(500, Math.max(1, Math.trunc(pageSize) || 20));
  const current = Math.max(1, Math.trunc(page) || 1);
  return { take, offset: (current - 1) * take };
}

/**
 * Full-text search against the GENERATED `searchIndex` tsvector column.
 * Returns rows ranked by `ts_rank` (title+body weighted by the english
 * config), with per-question vote totals and best-answer flags computed
 * from the answers. Empty/no-op queries return [].
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
  sort?: SearchSort;
  page?: number;
  pageSize?: number;
}): Promise<SearchQuestionRow[]> {
  const tsQuery = buildTsQuery(buildKeywords(q));
  if (!tsQuery) return [];

  const { take, offset } = clampPage(page, pageSize);
  const orderSql = ORDER_SQL[sort] ?? ORDER_SQL.new;
  const topicClause = topic
    ? Prisma.sql` AND q.topic ILIKE ${'%' + topic.replace(/[%_\\]/g, '\\$&') + '%'}`
    : Prisma.empty;

  return prisma.$queryRaw<SearchQuestionRow[]>(Prisma.sql`
    SELECT
      q.id,
      q.slug,
      q.title,
      q."bodyMd",
      q.topic,
      coalesce(v.votes, 0) AS votes,
      CASE WHEN q."bestAnswerId" IS NULL THEN 0 ELSE 1 END AS "isBest",
      coalesce(r.rank, 0) AS rank
    FROM "Question" q
    LEFT JOIN LATERAL (
      SELECT ts_rank(q."searchIndex", to_tsquery('english', ${tsQuery})) AS rank
    ) r ON true
    LEFT JOIN LATERAL (
      SELECT coalesce(sum(a.votes), 0)::int AS votes
      FROM "Answer" a
      WHERE a."questionId" = q.id AND a."status" = 'PUBLISHED'
    ) v ON true
    WHERE q."status" = 'PUBLISHED'
      AND q."searchIndex" @@ to_tsquery('english', ${tsQuery})
      ${topicClause}
    ORDER BY ${Prisma.raw(orderSql)}
    LIMIT ${take} OFFSET ${offset}
  `);
}

const candidateSelect = {
  id: true,
  slug: true,
  title: true,
  bodyMd: true,
  topic: true,
  viewCount: true,
  status: true,
  bestAnswerId: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, username: true, displayName: true } },
  _count: { select: { answers: true } },
  answers: { where: { status: 'PUBLISHED' as const }, select: { votes: true } },
  searchVec: true,
} satisfies Prisma.QuestionSelect;

type Candidate = Prisma.QuestionGetPayload<{ select: typeof candidateSelect }>;

function toItem(it: Candidate): SearchQuestionItem {
  return {
    id: it.id,
    slug: it.slug,
    title: it.title,
    bodyMd: it.bodyMd,
    topic: it.topic,
    viewCount: it.viewCount,
    votes: it.answers.reduce((sum, a) => sum + a.votes, 0),
    isBest: it.bestAnswerId !== null,
    answerCount: it._count.answers,
    createdAt: it.createdAt,
    updatedAt: it.updatedAt,
  };
}

function keywordWhere(q: string, topic?: string): Prisma.QuestionWhereInput {
  const terms = contentTerms(q);
  const where: Prisma.QuestionWhereInput = { status: 'PUBLISHED' };
  if (topic) where.topic = { contains: topic, mode: 'insensitive' };
  if (terms.length) {
    where.AND = terms.map((t) => ({
      OR: [
        { title: { contains: t, mode: 'insensitive' } },
        { bodyMd: { contains: t, mode: 'insensitive' } },
      ],
    }));
  }
  return where;
}

/**
 * Plain keyword search: stop-word-free terms must appear in the title or
 * body (AND across terms, OR across fields). Returns `{ items, total }`.
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
  sort?: SearchSort;
  page?: number;
  pageSize?: number;
}): Promise<{ items: SearchQuestionItem[]; total: number; keywords: string }> {
  const keywords = buildKeywords(q);
  const where = keywordWhere(q, topic);
  const { take, offset } = clampPage(page, pageSize);

  let orderBy: Prisma.QuestionOrderByWithRelationInput[] = [{ createdAt: 'desc' }];
  if (sort === 'votes') {
    // Prisma can't order by a computed vote sum; the plain layer proxies it
    // with answer count (same proxy the list route uses for `popular`).
    // `hybridSearch` sorts by the real summed votes.
    orderBy = [{ answers: { _count: 'desc' } }, { createdAt: 'desc' }];
  }

  const [total, rows] = await Promise.all([
    prisma.question.count({ where }),
    prisma.question.findMany({
      where,
      orderBy,
      skip: offset,
      take,
      select: candidateSelect,
    }),
  ]);

  return { items: rows.map(toItem), total, keywords };
}

/**
 * Hybrid: keyword candidates (or the recent corpus for paraphrase-only
 * queries) blended as `0.65 * tfidfCosine + 0.35 * tsRank`, then sorted per
 * `sort` and paginated. Same shape as `fullTextSearch`.
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
  sort?: SearchSort;
  page?: number;
  pageSize?: number;
}): Promise<{ items: SearchQuestionItem[]; total: number; keywords: string }> {
  const keywords = buildKeywords(q);
  if (!contentTerms(q).length) {
    return fullTextSearch({ q, topic, sort, page, pageSize });
  }
  const { take, offset } = clampPage(page, pageSize);

  // 1) FTS layer: ts_rank over the generated searchIndex column.
  let rankById = new Map<string, number>();
  try {
    const fts = await searchQuestions({ q, topic, sort: 'score', page: 1, pageSize: CANDIDATE_CAP });
    rankById = new Map(fts.map((r) => [r.id, r.rank]));
  } catch (err) {
    console.warn('[search] fts layer failed, continuing semantic-only:', err);
  }

  // 2) Candidates: keyword matches; fall back to the recent corpus when the
  //    query only works paraphrastically (no keyword hits at all).
  let where = keywordWhere(q, topic);
  let total = await prisma.question.count({ where });
  let rows = total
    ? await prisma.question.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        take: CANDIDATE_CAP,
        select: candidateSelect,
      })
    : [];

  if (!rows.length) {
    const fallback: Prisma.QuestionWhereInput = { status: 'PUBLISHED' };
    if (topic) fallback.topic = { contains: topic, mode: 'insensitive' };
    where = fallback;
    total = await prisma.question.count({ where });
    rows = await prisma.question.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      take: CANDIDATE_CAP,
      select: candidateSelect,
    });
  }
  if (!rows.length) return { items: [], total: 0, keywords };

  // 3) Semantic layer: cosine against the stored hashing embedding
  //    (`searchVec`); fall back to in-process TF-IDF for rows that were
  //    never reindexed (e.g. right after a migration, before
  //    `npm run reindex:search`).
  const semById = new Map<string, number>();
  const queryVec = embedText(q);
  const hasStored = rows.some((r) => r.searchVec.length === EMBED_DIM);
  if (hasStored) {
    for (const r of rows) semById.set(r.id, cosine(queryVec, r.searchVec));
  } else {
    const docs: CorpusDoc[] = rows.map((it) => ({
      id: it.id,
      type: 'question',
      entityId: it.id,
      title: it.title,
      bodyMd: it.bodyMd,
      topic: it.topic,
    }));
    for (const r of rankSimilar({ q, docs, topK: docs.length })) {
      semById.set(r.id, r.score);
    }
  }
  const maxRank = rankById.size ? Math.max(...rankById.values(), 1e-9) : 0;

  const blended = rows.map((it) => {
    const item = toItem(it);
    const semantic = semById.get(it.id) ?? 0;
    const ftsScore = maxRank > 0 ? (rankById.get(it.id) ?? 0) / maxRank : 0;
    return { ...item, _row: it, blended: 0.65 * semantic + 0.35 * ftsScore };
  });

  if (sort === 'votes') {
    blended.sort((a, b) => b.votes - a.votes || b.blended - a.blended);
  } else if (sort === 'new') {
    blended.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } else if (sort === 'top') {
    blended.sort((a, b) => b.blended - a.blended || b.votes - a.votes);
  } else {
    blended.sort((a, b) => b.blended - a.blended);
  }

  return { items: blended.slice(offset, offset + take).map(({ _row, ...item }) => item), total, keywords };
}

// ---- searchVec maintenance -----------------------------------------

/**
 * Sanitize a vector for storage. NOTE: pass the JS array itself (Prisma
 * serializes `number[]` natively) — a pre-formatted `[...]` string gets
 * double-encoded and Postgres rejects it with 22P02.
 */
function toSqlArray(vec: number[]): number[] {
  return vec.map((v) => (Number.isFinite(v) ? v : 0));
}

/** Recompute + store the hashing embedding for one question. Never throws. */
export async function embedQuestion(questionId: string): Promise<void> {
  try {
    const row = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true, title: true, bodyMd: true },
    });
    if (!row) return;
    const vec = embedText(`${row.title} ${row.bodyMd}`);
    await prisma.$executeRaw`UPDATE "Question" SET "searchVec" = ${toSqlArray(vec)}::double precision[] WHERE "id" = ${row.id}`;
  } catch (err) {
    console.warn('[search] embedQuestion failed:', err);
  }
}

/** Recompute + store the hashing embedding for one answer. Never throws. */
export async function embedAnswer(answerId: string): Promise<void> {
  try {
    const row = await prisma.answer.findUnique({
      where: { id: answerId },
      select: { id: true, bodyMd: true },
    });
    if (!row) return;
    const vec = embedText(row.bodyMd);
    await prisma.$executeRaw`UPDATE "Answer" SET "searchVec" = ${toSqlArray(vec)}::double precision[] WHERE "id" = ${row.id}`;
  } catch (err) {
    console.warn('[search] embedAnswer failed:', err);
  }
}

/**
 * Full backfill of `searchVec` for every question + answer
 * (`npm run reindex:search`). Idempotent; safe to re-run any time.
 */
export async function refreshSearchVecs(): Promise<void> {
  try {
    const questions = await prisma.question.findMany({
      select: { id: true, title: true, bodyMd: true },
    });
    for (const row of questions) {
      const vec = embedText(`${row.title} ${row.bodyMd}`);
      await prisma.$executeRaw`UPDATE "Question" SET "searchVec" = ${toSqlArray(vec)}::double precision[] WHERE "id" = ${row.id}`;
    }
    const answers = await prisma.answer.findMany({ select: { id: true, bodyMd: true } });
    for (const row of answers) {
      const vec = embedText(row.bodyMd);
      await prisma.$executeRaw`UPDATE "Answer" SET "searchVec" = ${toSqlArray(vec)}::double precision[] WHERE "id" = ${row.id}`;
    }
    console.log(`[search] reindexed ${questions.length} questions, ${answers.length} answers`);
  } catch (err) {
    console.warn('[search] refreshSearchVecs failed:', err);
  }
}
