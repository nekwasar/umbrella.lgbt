/**
 * M6 SEO check — starts API + built web app, then verifies:
 *  1. Required JSON-LD types + meta on representative pages
 *  2. /sitemap.xml + /robots.txt serve correctly
 *  3. Every internal link across all sitemap pages resolves (200)
 * Run: npm run check:seo (from apps/web)
 */
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

const API_PORT = 3000;
const WEB_PORT = 3001;
const API_URL = `http://localhost:${API_PORT}`;
const WEB_URL = `http://localhost:${WEB_PORT}`;
const SITE = 'https://umbrella.lgbt';

let api: ChildProcess;
let web: ChildProcess;
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

function stop(proc: ChildProcess) {
  try {
    if (proc.pid) process.kill(-proc.pid, 'SIGTERM');
  } catch {
    /* already gone */
  }
}

async function waitFor(url: string, timeoutMs = 25000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (res.status < 500) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

async function get(url: string): Promise<{ status: number; text: string }> {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  return { status: res.status, text: await res.text() };
}

async function main() {
  api = spawn('node', ['dist/index.js'], { cwd: path.resolve(__dirname, '../../api'), stdio: 'ignore', detached: true });
  web = spawn('npx', ['next', 'start', '-p', String(WEB_PORT)], { cwd: __dirname + '/..', stdio: 'ignore', detached: true });

  console.log('\nWaiting for API + Web…\n');
  await waitFor(`${API_URL}/health`);
  await waitFor(`${WEB_URL}/`);

  // ---- robots + sitemap ----
  const robots = await get(`${WEB_URL}/robots.txt`);
  ok('GET /robots.txt -> 200 + sitemap line', robots.status === 200 && robots.text.includes('Sitemap:'));

  const sitemap = await get(`${WEB_URL}/sitemap.xml`);
  ok('GET /sitemap.xml -> 200 + xml', sitemap.status === 200 && sitemap.text.includes('<urlset'));
  const locs = [...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  ok(`sitemap has >= 160 URLs (got ${locs.length})`, locs.length >= 160, locs.length);

  // ---- schema checks ----
  const schemaChecks: Array<{ path: string; types: string[] }> = [
    { path: '/', types: ['Organization', 'WebSite'] },
    { path: '/about', types: ['WebPage', 'BreadcrumbList'] },
    { path: '/blog/coming-out-guide', types: ['Article', 'BreadcrumbList'] },
    { path: '/glossary/lgbtq', types: ['DefinedTerm', 'BreadcrumbList'] },
    { path: '/city/berlin', types: ['WebPage', 'BreadcrumbList'] },
    { path: '/resources/us', types: ['WebPage', 'BreadcrumbList'] },
    { path: '/qa', types: ['ItemList', 'WebPage', 'BreadcrumbList'] },
    { path: '/qa/what-is-gender-dysphoria', types: ['FAQPage', 'BreadcrumbList'] }
  ];
  for (const sc of schemaChecks) {
    const { status, text } = await get(`${WEB_URL}${sc.path}`);
    ok(`GET ${sc.path} -> 200`, status === 200);
    for (const t of sc.types) {
      ok(`  ${sc.path} has ${t} JSON-LD`, text.includes(`"@type":"${t}"`) || text.includes(`"@type": "${t}"`));
    }
  }

  // city geo meta
  const berlin = await get(`${WEB_URL}/city/berlin`);
  ok('city page has geo.region meta', berlin.text.includes('geo.region'));

  // canonical present on a content page
  const blog = await get(`${WEB_URL}/blog/coming-out-guide`);
  ok('content page has canonical link', blog.text.includes('rel="canonical"'));

  // ---- link crawl ----
  const paths = locs.map((l) => (l.startsWith(SITE) ? l.slice(SITE.length) : l));
  const hrefs = new Set<string>();
  for (const p of paths) {
    const { status, text } = await get(`${WEB_URL}${p}`);
    if (status !== 200) {
      ok(`crawl ${p} -> 200`, false, status);
      continue;
    }
    for (const m of text.matchAll(/href="([^"]+)"/g)) {
      const raw = m[1];
      if (raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('javascript:')) continue;
      if (raw.startsWith('http')) {
        if (raw.startsWith(SITE)) {
          let pathOnly = raw.slice(SITE.length).split('?')[0].split('#')[0];
          if (pathOnly) hrefs.add(pathOnly);
        }
        continue;
      }
      let pathOnly = raw.split('?')[0].split('#')[0];
      if (pathOnly) hrefs.add(pathOnly);
    }
  }
  ok(`collected ${hrefs.size} unique internal paths`, hrefs.size > 0, hrefs.size);

  let broken = 0;
  for (const h of [...hrefs].sort()) {
    const res = await get(`${WEB_URL}${h}`);
    if (res.status >= 400) {
      broken++;
      console.log(`    BROKEN ${h} -> ${res.status}`);
    }
  }
  ok(`internal links: ${broken} broken of ${hrefs.size}`, broken === 0, broken);

  stop(api);
  stop(web);

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 || broken > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('check crashed:', err);
  if (api) stop(api);
  if (web) stop(web);
  process.exit(1);
});
