-- Hybrid search columns for Q&A (full-text tsvector + embedding vector)
--
-- searchIndex: GENERATED tsvector — Postgres keeps it in sync automatically on
--   INSERT/UPDATE of the source columns. Prisma never reads or writes it (the
--   field is Unsupported("tsvector") in schema.prisma), so no app code is
--   needed to maintain it.
-- searchVec: hashing embedding (Float[] == double precision[], EMBED_DIM dims)
--   written by apps/api/src/lib/search.ts (embedQuestion/embedAnswer on Q&A
--   writes; full backfill via `npm run reindex:search`). Cosine similarity is
--   computed in JS — no pgvector required.
--
-- All statements are idempotent (IF NOT EXISTS) so this file can also be
-- applied by hand to the live database, which has no prisma_migrations table:
--   docker exec -i umbrella-db-1 psql -U umbrella -d umbrella < migration.sql

-- Question: full-text index + embedding vector
ALTER TABLE "Question"
  ADD COLUMN IF NOT EXISTS "searchIndex" tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce("title", '') || ' ' || coalesce("bodyMd", ''))) STORED;

ALTER TABLE "Question"
  ADD COLUMN IF NOT EXISTS "searchVec" double precision[] NOT NULL DEFAULT '{}';

-- Answer: full-text index + embedding vector (answers have no title)
ALTER TABLE "Answer"
  ADD COLUMN IF NOT EXISTS "searchIndex" tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce("bodyMd", ''))) STORED;

ALTER TABLE "Answer"
  ADD COLUMN IF NOT EXISTS "searchVec" double precision[] NOT NULL DEFAULT '{}';

-- GIN indexes for fast full-text lookups (mirrors @@index([...], type: Gin))
CREATE INDEX IF NOT EXISTS "Question_searchIndex_idx" ON "Question" USING gin("searchIndex");
CREATE INDEX IF NOT EXISTS "Answer_searchIndex_idx" ON "Answer" USING gin("searchIndex");

-- New btree indexes declared in schema.prisma
CREATE INDEX IF NOT EXISTS "Answer_questionId_idx" ON "Answer"("questionId");
CREATE INDEX IF NOT EXISTS "Comment_targetType_targetId_idx" ON "Comment"("targetType", "targetId");
CREATE INDEX IF NOT EXISTS "Report_targetType_targetId_idx" ON "Report"("targetType", "targetId");
