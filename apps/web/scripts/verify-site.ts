/**
 * Site-wide SSR smoke (M5) — starts API + built Next app and verifies the new
 * public pages render real content server-side.
 * Run: npm run verify:site (from apps/web)
 */
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

const API_PORT = 3000;
const WEB_PORT = 3001;
const API_URL = `http://localhost:${API_PORT}`;
const WEB_URL = `http://localhost:${WEB_PORT}`;

const apiCwd = path.resolve(__dirname, '../../api');
const webCwd = __dirname + '/..';

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

async function get(url: string): Promise<{ status: number; html: string }> {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  return { status: res.status, html: await res.text() };
}

async function main() {
  api = spawn('node', ['dist/index.js'], { cwd: apiCwd, stdio: 'ignore', detached: true });
  web = spawn('npx', ['next', 'start', '-p', String(WEB_PORT)], {
    cwd: webCwd,
    stdio: 'ignore',
    detached: true
  });

  console.log('\nWaiting for API + Web…\n');
  await waitFor(`${API_URL}/health`);
  await waitFor(`${WEB_URL}/`);

  const checks: Array<{ path: string; needle: string }> = [
    { path: '/', needle: 'The everything queer app' },
    { path: '/about', needle: 'Our Mission' },
    { path: '/features', needle: 'Feature' },
    { path: '/waitlist', needle: 'Stay Updated' },
    { path: '/contact', needle: 'hello@umbrella.lgbt' },
    { path: '/privacy', needle: 'Privacy' },
    { path: '/blog', needle: 'How to Come Out' },
    { path: '/blog/coming-out-guide', needle: 'Coming' },
    { path: '/glossary', needle: 'LGBTQ' },
    { path: '/glossary/lgbtq', needle: 'Lesbian' },
    { path: '/city', needle: 'Berlin' },
    { path: '/city/berlin', needle: 'Berlin' },
    { path: '/resources', needle: 'United States' },
    { path: '/resources/us', needle: 'Helplines' },
    { path: '/search?q=coming%20out', needle: 'Search' },
    { path: '/qa', needle: 'Ask a question' }
  ];

  for (const c of checks) {
    const { status, html } = await get(`${WEB_URL}${c.path}`);
    ok(`GET ${c.path} -> ${status}`, status === 200);
    ok(`  contains "${c.needle}"`, html.includes(c.needle));
  }

  // dynamic core page 404 for unknown
  const missing = await get(`${WEB_URL}/definitely-not-a-core-page`);
  ok('unknown core page -> 404', missing.status === 404);

  stop(api);
  stop(web);

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('verify crashed:', err);
  if (api) stop(api);
  if (web) stop(web);
  process.exit(1);
});
