-- Add full-text + vector search columns for Q&A (hybrid search MVP)
-- Run: npx prisma migrate deploy  (or prisma migrate dev --name "add search columns")

-- Question: full-text index + embedding vector
ALTER TABLE "Question"
ADD COLUMN "searchIndex" tsvector;

ALTER TABLE "Question"
ADD COLUMN "searchVec" float4[];

-- Answer: full-text index + embedding vector
ALTER TABLE "Answer"
ADD COLUMN "searchIndex" tsvector;

ALTER TABLE "Answer"
ADD COLUMN "searchVec" float4[];

-- Indexes: GIN for tsvector (fast full-text), GIN for vector
CREATE INDEX "Question_searchIndex_idx" ON "Question" USING gin("searchIndex");
CREATE INDEX "Answer_searchIndex_idx" ON "Answer" USING gin("searchIndex");

-- If your Postgres has the vector extension, this becomes the primary
-- similarity index. Uncomment when vector support is available:
-- CREATE INDEX "Question_searchVec_idx" ON "Question" USING vn("searchVec");
-- CREATE INDEX "Answer_searchVec_idx" ON "Answer" USING vn("searchVec");
