/**
 * Seed the community forum boards. Idempotent: upserts by slug.
 * Run: npm run seed:forum
 */
import { prisma } from '../db/prisma';

const BOARDS: Array<{ category: string; name: string; slug: string; description: string; position: number }> = [
  { category: 'General Discussion', name: 'Introductions', slug: 'introductions', description: 'New here? Say hello and tell us a little about yourself.', position: 0 },
  { category: 'General Discussion', name: 'General Chat', slug: 'general-chat', description: 'Everyday conversation about anything under the umbrella.', position: 1 },
  { category: 'General Discussion', name: 'Media & Culture', slug: 'media-culture', description: 'Books, films, music, games, and queer culture.', position: 2 },
  { category: 'Community & Support', name: 'Coming Out Support', slug: 'coming-out-support', description: 'Advice and encouragement for every stage of coming out.', position: 0 },
  { category: 'Community & Support', name: 'Mental Health', slug: 'mental-health', description: 'Peer support for tough days. You are not alone.', position: 1 },
  { category: 'Community & Support', name: 'Safety & Advice', slug: 'safety-advice', description: 'Practical guidance on staying safe online and offline.', position: 2 },
  { category: 'Identity & Pride', name: 'Gender Identity', slug: 'gender-identity', description: 'Conversations about gender, transition, and euphoria.', position: 0 },
  { category: 'Identity & Pride', name: 'Sexuality & Labels', slug: 'sexuality-labels', description: 'Exploring attraction, orientation, and the words we use.', position: 1 },
  { category: 'Identity & Pride', name: 'Pride & Events', slug: 'pride-events', description: 'Parades, meetups, and happenings near you.', position: 2 }
];

async function main() {
  for (const b of BOARDS) {
    await prisma.forumBoard.upsert({
      where: { slug: b.slug },
      create: b,
      update: { category: b.category, name: b.name, description: b.description, position: b.position }
    });
  }
  const total = await prisma.forumBoard.count();
  console.log(`Forum seed done. Boards: ${total}`);
}

main()
  .catch((err) => {
    console.error('Forum seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
