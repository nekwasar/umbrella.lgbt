/**
 * Seed initial bulletins. Idempotent: skips when titles already exist.
 * Run: npm run seed:bulletins
 */
import { prisma } from '../db/prisma';

const BULLETINS: Array<{ title: string; bodyMd: string; pinned: boolean }> = [
  {
    title: 'Welcome to Umbrella',
    bodyMd:
      'This is the pre-launch home of **Umbrella** — the everything queer app.\n\nWhile we build the full platform for 2026, this site is already alive: read the **blog**, look things up in the **glossary**, ask in **Q&A**, or post in the **community forum**.\n\nBig things are coming. Watch this bulletin space.\n\n— The Umbrella team',
    pinned: true
  },
  {
    title: 'Forum + comments are open',
    bodyMd:
      'Two new community features just went live:\n\n- **Community forum** at `/forum` — introductions, support, identity, pride boards.\n- **Comments** on blog posts and every bulletin.\n\nSay hello in the introductions board — we answer every one.',
    pinned: false
  },
  {
    title: 'The plan for 2026',
    bodyMd:
      'The full app ships in 2026: profiles, meet, community, chats, events — all age-gated and privacy-first. No algorithms, no data sold, ever.\n\nWant to be first in? Post ideas in the forum — founder reads everything.',
    pinned: false
  }
];

async function main() {
  let created = 0;
  for (const b of BULLETINS) {
    const exists = await prisma.bulletin.findFirst({ where: { title: b.title } });
    if (exists) continue;
    await prisma.bulletin.create({ data: { ...b, status: 'PUBLISHED' } });
    created++;
  }
  const total = await prisma.bulletin.count();
  console.log(`Bulletin seed done. Created: ${created}. Total: ${total}`);
}

main()
  .catch((err) => {
    console.error('Bulletin seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
