-- QuestionLog: audit trail for Q&A questions (created/edited/removed/restored).
-- Idempotent on purpose — the live DB has no prisma_migrations table and this
-- is applied manually via psql (AGENTS.md), while CI runs migrate deploy.

CREATE TABLE IF NOT EXISTS "QuestionLog" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "actorId" TEXT,
    "actorName" TEXT,
    "actorKind" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "QuestionLog_questionId_createdAt_idx" ON "QuestionLog"("questionId", "createdAt");
CREATE INDEX IF NOT EXISTS "QuestionLog_createdAt_idx" ON "QuestionLog"("createdAt");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QuestionLog_questionId_fkey') THEN
        ALTER TABLE "QuestionLog" ADD CONSTRAINT "QuestionLog_questionId_fkey"
            FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
