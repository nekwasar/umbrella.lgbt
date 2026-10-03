/**
 * Full search reindex — backfills `Question.searchVec` / `Answer.searchVec`
 * from current content (the tsvector `searchIndex` columns are maintained by
 * Postgres and never need this). Idempotent; safe to run any time, e.g.
 * after a migration or a bulk content import:
 *
 *   npm run reindex:search
 */
import { prisma } from '../src/db/prisma';
import { refreshSearchVecs } from '../src/lib/search';

async function main() {
  await refreshSearchVecs();
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
