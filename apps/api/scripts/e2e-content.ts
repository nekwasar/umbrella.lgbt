/**
 * End-to-end content API tests (M2).
 *
 * Requires a reachable Postgres (DATABASE_URL), SUPERADMIN_PASSWORD, and the
 * legacy content migration already run (npm run migrate:content).
 * Run: npm run test:e2e:content
 */
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { ensureSuperAdmin } from '../src/lib/superadmin';

const PORT = 3198;
const BASE = `http://localhost:${PORT}`;

let passed = 0;
let failed = 0;

function ok(name: string, cond: boolean, extra?: unknown) {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${extra !== undefined ? ` -> ${JSON.stringify(extra)}` : ''}`);
  }
}

function cookieFrom(res: Response): string {
  const setCookie = res.headers.get('set-cookie');
  return setCookie ? setCookie.split(';')[0] : '';
}

async function main() {
  await ensureSuperAdmin();
  const app = createApp();
  const server = app.listen(PORT);
  await new Promise<void>((r) => server.once('listening', r));

  // admin session
  const login = await fetch(`${BASE}/api/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: process.env.SUPERADMIN_USERNAME || 'admin', password: process.env.SUPERADMIN_PASSWORD })
  });
  ok('admin login -> 200', login.status === 200);
  const auth = { Cookie: cookieFrom(login), 'Content-Type': 'application/json' };

  console.log('\nE2E CONTENT — server on :' + PORT + '\n');

  // ---- migration sanity ----
  const totalRes = await fetch(`${BASE}/api/admin/pages?pageSize=1`, { headers: auth });
  const totalBody = await totalRes.json();
  ok('admin list pages -> 200', totalRes.status === 200);
  ok(`migration imported >= 156 pages (got ${totalBody.total})`, totalBody.total >= 156, totalBody.total);

  // ---- create ----
  const ts = Date.now();
  const slugA = `e2e-health-${ts}`;
  const slugB = `e2e-health-${ts + 1}`;
  const slugC = `e2e-culture-${ts}`;

  const create = async (slug: string, topic: string, title: string) => {
    const r = await fetch(`${BASE}/api/admin/pages`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        type: 'BLOG',
        slug,
        title,
        topic,
        status: 'PUBLISHED',
        contentMd: `## Section\n\nThis is body content for ${title}. It is long enough to generate a sensible reading time and description for the page.`,
        meta: {
          metaTitle: `${title} | Umbrella.lgbt`,
          metaDescription: `A hand-written description for ${title}.`,
          keywords: ['queer', 'health'],
          canonicalUrl: `https://umbrella.lgbt/blog/${slug}`
        }
      })
    });
    return r;
  };

  let r = await create(slugA, 'health', 'E2E Health Post A');
  let body = await r.json();
  ok('create page A -> 201', r.status === 201, body);
  const idA = body?.page?.id;
  ok('create page A -> returns id + readingTime > 0', !!idA && body?.page?.readingTime > 0, body);
  ok('create page A -> meta stored', body?.page?.meta?.metaTitle === 'E2E Health Post A | Umbrella.lgbt', body);

  r = await create(slugB, 'health', 'E2E Health Post B');
  body = await r.json();
  ok('create page B -> 201', r.status === 201, body);
  const idB = body?.page?.id;

  r = await create(slugC, 'culture', 'E2E Culture Post C');
  body = await r.json();
  ok('create page C -> 201', r.status === 201, body);
  const idC = body?.page?.id;

  // duplicate slug
  r = await fetch(`${BASE}/api/admin/pages`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ type: 'BLOG', slug: slugA, title: 'Duplicate' })
  });
  ok('create duplicate slug -> 409', r.status === 409);

  // invalid slug
  r = await fetch(`${BASE}/api/admin/pages`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ type: 'BLOG', slug: 'Bad Slug!', title: 'Bad' })
  });
  ok('create invalid slug -> 400', r.status === 400);

  // ---- get by id ----
  r = await fetch(`${BASE}/api/admin/pages/${idA}`, { headers: auth });
  body = await r.json();
  ok('get page by id -> 200 + title', r.status === 200 && body?.page?.title === 'E2E Health Post A', body);

  // ---- update (title + content + meta) ----
  r = await fetch(`${BASE}/api/admin/pages/${idA}`, {
    method: 'PUT',
    headers: auth,
    body: JSON.stringify({
      type: 'BLOG',
      slug: slugA,
      title: 'E2E Health Post A (updated)',
      status: 'PUBLISHED',
      contentMd: '## New body\n\nUpdated content with a bit more text to recalc reading time.',
      meta: { metaTitle: 'Updated Title | Umbrella.lgbt', ogTitle: 'OG Updated' }
    })
  });
  body = await r.json();
  ok('update page -> 200 + new title', r.status === 200 && body?.page?.title === 'E2E Health Post A (updated)', body);
  ok('update page -> meta updated', body?.page?.meta?.ogTitle === 'OG Updated', body);

  // ---- meta-only single update ----
  r = await fetch(`${BASE}/api/admin/pages/${idA}/meta`, {
    method: 'PATCH',
    headers: auth,
    body: JSON.stringify({ metaDescription: 'Meta-only description update.', twitterCard: 'summary_large_image' })
  });
  body = await r.json();
  ok('meta-only update -> 200', r.status === 200, body);

  // ---- bulk meta update ----
  r = await fetch(`${BASE}/api/admin/pages/meta/bulk`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      items: [
        { id: idB, meta: { metaTitle: 'B Bulk Title', noindex: true } },
        { id: idC, meta: { metaTitle: 'C Bulk Title', ogType: 'article' } }
      ]
    })
  });
  body = await r.json();
  ok('bulk meta update -> 200 + updated 2', r.status === 200 && body?.updated === 2, body);

  r = await fetch(`${BASE}/api/admin/pages/${idB}`, { headers: auth });
  body = await r.json();
  ok('bulk meta applied to B', body?.page?.meta?.metaTitle === 'B Bulk Title' && body?.page?.meta?.noindex === true, body);

  // ---- public list + search ----
  r = await fetch(`${BASE}/api/pages?type=BLOG&q=Health%20Post%20B`);
  body = await r.json();
  ok('public list by type + search -> found B', r.status === 200 && body.items.some((p: { slug: string }) => p.slug === slugB), body.total);

  // ---- public single + related ----
  r = await fetch(`${BASE}/api/pages/blog/${slugA}`);
  body = await r.json();
  ok('public single -> 200 + body present', r.status === 200 && body?.page?.contentMd?.length > 0, body);
  const relatedSlugs = (body?.related || []).map((p: { slug: string }) => p.slug);
  ok('public related includes B (same topic health)', relatedSlugs.includes(slugB), relatedSlugs);

  // public 404 for unpublished
  await prisma.page.update({ where: { id: idC }, data: { status: 'DRAFT' } });
  r = await fetch(`${BASE}/api/pages/blog/${slugC}`);
  ok('public 404 for draft page', r.status === 404);

  // ---- delete ----
  r = await fetch(`${BASE}/api/admin/pages/${idC}`, { method: 'DELETE', headers: auth });
  ok('delete page C -> 200', r.status === 200);

  r = await fetch(`${BASE}/api/admin/pages/${idC}`, { headers: auth });
  ok('get deleted page -> 404', r.status === 404);

  // ---- unauth guard ----
  r = await fetch(`${BASE}/api/admin/pages?pageSize=1`);
  ok('admin list without auth -> 401', r.status === 401);

  // cleanup test rows
  await prisma.page.deleteMany({ where: { id: { in: [idA, idB] } } });

  server.close();
  await prisma.$disconnect();

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('E2E crashed:', err);
  await prisma.$disconnect();
  process.exit(1);
});
