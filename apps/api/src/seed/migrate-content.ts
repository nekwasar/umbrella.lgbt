/**
 * M2 migration — imports the legacy static site content (content.json + content/*.md)
 * into the database. Idempotent: re-running upserts existing pages by (type, slug).
 *
 * Run: npm run migrate:content
 * Optional overrides: CONTENT_JSON_PATH, CONTENT_DIR
 */
import fs from 'fs';
import path from 'path';
import { PageType } from '@prisma/client';
import { prisma } from '../db/prisma';
import { readingTime } from '../lib/pages';

const ROOT = path.resolve(__dirname, '../../../../'); // apps/api/src/seed -> repo root
const contentJsonPath = process.env.CONTENT_JSON_PATH || path.join(ROOT, 'content.json');
const contentDir = process.env.CONTENT_DIR || path.join(ROOT, 'content');

const TYPE_MAP: Record<string, PageType> = {
  core: 'CORE',
  qa: 'QA',
  glossary: 'GLOSSARY',
  city: 'CITY',
  resources: 'RESOURCES',
  blog: 'BLOG'
};

// Geo metadata for city guides (region code, placename, lat;lon)
const CITY_GEO: Record<string, { region: string; placename: string; position: string }> = {
  berlin: { region: 'DE-BE', placename: 'Berlin', position: '52.5200;13.4050' },
  'new-york': { region: 'US-NY', placename: 'New York', position: '40.7128;-74.0060' },
  london: { region: 'GB-ENG', placename: 'London', position: '51.5072;-0.1276' },
  'san-francisco': { region: 'US-CA', placename: 'San Francisco', position: '37.7749;-122.4194' },
  'los-angeles': { region: 'US-CA', placename: 'Los Angeles', position: '34.0522;-118.2437' },
  chicago: { region: 'US-IL', placename: 'Chicago', position: '41.8781;-87.6298' },
  toronto: { region: 'CA-ON', placename: 'Toronto', position: '43.6532;-79.3832' },
  amsterdam: { region: 'NL-NH', placename: 'Amsterdam', position: '52.3676;4.9041' },
  barcelona: { region: 'ES-CT', placename: 'Barcelona', position: '41.3874;2.1686' },
  paris: { region: 'FR-IDF', placename: 'Paris', position: '48.8566;2.3522' },
  tokyo: { region: 'JP-13', placename: 'Tokyo', position: '35.6762;139.6503' },
  sydney: { region: 'AU-NSW', placename: 'Sydney', position: '-33.8688;151.2093' },
  melbourne: { region: 'AU-VIC', placename: 'Melbourne', position: '-37.8136;144.9631' },
  portland: { region: 'US-OR', placename: 'Portland', position: '45.5152;-122.6784' },
  seattle: { region: 'US-WA', placename: 'Seattle', position: '47.6062;-122.3321' },
  manchester: { region: 'GB-ENG', placename: 'Manchester', position: '53.4808;-2.2426' },
  brighton: { region: 'GB-ENG', placename: 'Brighton', position: '50.8225;-0.1372' },
  stockholm: { region: 'SE-AB', placename: 'Stockholm', position: '59.3293;18.0686' },
  copenhagen: { region: 'DK-84', placename: 'Copenhagen', position: '55.6761;12.5683' },
  madrid: { region: 'ES-MD', placename: 'Madrid', position: '40.4168;-3.7038' }
};

function extractDescription(md: string): string | null {
  if (!md) return null;
  const lines = md.split('\n');
  const bodyLines = lines.filter((l) => !/^\s*#{1,6}\s/.test(l));
  const text = bodyLines
    .join(' ')
    .replace(/[*_`>\[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;

  const sentences = text
    .split(/\.\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25 && !/^(Short Answer|Definition)$/i.test(s));

  let desc = sentences[0];
  if (!desc) desc = text.slice(0, 155);
  if (!desc) return null;
  if (!/\.$/.test(desc)) desc += '.';
  if (desc.length > 160) {
    const cut = desc.lastIndexOf('.', 160);
    desc = (cut > 25 ? desc.slice(0, cut + 1) : desc.slice(0, 157)) + '';
  }
  return desc;
}

async function main() {
  if (!fs.existsSync(contentJsonPath)) {
    console.error(`content.json not found at ${contentJsonPath}`);
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(contentJsonPath, 'utf8'));
  const site = config.site;
  let imported = 0;
  let updated = 0;

  for (const p of config.pages) {
    const type = TYPE_MAP[p.type];
    if (!type) {
      console.warn(`  skip: unknown type "${p.type}" (${p.slug})`);
      continue;
    }

    const mdPath = path.join(contentDir, p.type, `${p.slug}.md`);
    const contentMd = fs.existsSync(mdPath) ? fs.readFileSync(mdPath, 'utf8') : '';

    const urlPath = type === 'CORE' ? `/${p.slug}` : `/${p.type}/${p.slug}`;
    const geo = type === 'CITY' ? CITY_GEO[p.slug] : undefined;
    const meta = {
      metaTitle: null,
      metaDescription: extractDescription(contentMd),
      keywords: [] as string[],
      canonicalUrl: `${site.url}${urlPath}`,
      ogType: type === 'BLOG' ? 'article' : 'website',
      ...(geo
        ? {
            geoRegion: geo.region,
            geoPlacename: geo.placename,
            geoPosition: geo.position,
            icbm: geo.position.replace(';', ',')
          }
        : {})
    };

    const data = {
      title: p.title,
      contentMd,
      status: 'PUBLISHED' as const,
      seeded: p.seeded ?? true,
      topic: p.topic || null,
      category: p.category || null,
      date: p.date ? new Date(`${p.date}T00:00:00.000Z`) : null,
      author: null,
      readingTime: readingTime(contentMd),
      publishedAt: new Date()
    };

    const existing = await prisma.page.findUnique({
      where: { type_slug: { type, slug: p.slug } }
    });

    if (existing) {
      await prisma.page.update({ where: { id: existing.id }, data });
      await prisma.pageMeta.upsert({
        where: { pageId: existing.id },
        create: { pageId: existing.id, ...meta },
        update: meta
      });
      updated++;
    } else {
      await prisma.page.create({
        data: { type, slug: p.slug, ...data, meta: { create: meta } }
      });
      imported++;
    }
  }

  const total = await prisma.page.count();
  const byType = await prisma.page.groupBy({ by: ['type'], _count: true });
  console.log(`\nMigration done: ${imported} imported, ${updated} updated.`);
  console.log(`Total pages: ${total}`);
  for (const g of byType.sort((a, b) => a.type.localeCompare(b.type))) {
    console.log(`  ${g.type}: ${g._count}`);
  }
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
