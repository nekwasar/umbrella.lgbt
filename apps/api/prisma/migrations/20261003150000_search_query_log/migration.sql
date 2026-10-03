-- SearchQueryLog: what people searched for in Q&A. Deduplicated by normalized
-- query; `zeros` counts searches that found nothing (the unanswered-gap signal).
-- Idempotent on purpose — the live DB has no prisma_migrations table and this is
-- applied manually via psql (AGENTS.md), while CI runs migrate deploy.

CREATE TABLE IF NOT EXISTS "SearchQueryLog" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 1,
    "zeros" INTEGER NOT NULL DEFAULT 0,
    "lastResults" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchQueryLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SearchQueryLog_query_key" ON "SearchQueryLog"("query");
CREATE INDEX IF NOT EXISTS "SearchQueryLog_zeros_hits_idx" ON "SearchQueryLog"("zeros" DESC, "hits" DESC);
CREATE INDEX IF NOT EXISTS "SearchQueryLog_updatedAt_idx" ON "SearchQueryLog"("updatedAt");