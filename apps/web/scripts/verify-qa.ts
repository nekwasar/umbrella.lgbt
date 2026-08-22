/**
 * Q&A SSR smoke verification.
 * Starts the API (dist) + built Next app, seeds a question + answer via the API,
 * then verifies /qa and /qa/[slug] render real content server-side (SEO check).
 * Run after building both apps. Run: npm run verify:qa (from apps/web)
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

function stop(proc: ChildProcess) {
  try {
    if (proc.pid) process.kill(-proc.pid, 'SIGTERM');
  } catch {
    /* already gone */
  }
}

function ok(name: string, cond: boolean, extra?: unknown) {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${extra !== undefined ? ` -> ${JSON.stringify(extra)}` : ''}`);
  }
}

async function waitFor(url: string, timeoutMs = 20000): Promise<boolean> {
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

async function get(url: string): Promise<Response> {
  return fetch(url, { signal: AbortSignal.timeout(15000) });
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
  await waitFor(`${WEB_URL}/qa`);

  // seed a question + answer
  const ts = Date.now();
  const username = `ssr_${ts}`;
  const register = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'strongpass123', displayName: 'Sam' }),
    signal: AbortSignal.timeout(15000)
  });
  const cookie = (register.headers.get('set-cookie') || '').split(';')[0];

  const title = `Is it safe to come out at work in ${ts}?`;
  const ask = await fetch(`${API_URL}/api/qa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ title, bodyMd: 'I need advice about coming out at work.', topic: 'coming-out' }),
    signal: AbortSignal.timeout(15000)
  });
  const askBody = await ask.json();
  const slug = askBody?.question?.slug;
  ok('seeded question via API -> 201', ask.status === 201 && !!slug, askBody);

  const answerText = `Start with one trusted coworker in ${ts}.`;
  await fetch(`${API_URL}/api/qa/${slug}/answers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ bodyMd: answerText }),
    signal: AbortSignal.timeout(15000)
  });

  // ---- SSR checks ----
  const listRes = await get(`${WEB_URL}/qa`);
  const listHtml = await listRes.text();
  ok('GET /qa -> 200', listRes.status === 200);
  if (listRes.status !== 200) {
    console.log('  /qa status:', listRes.status, 'body:', listHtml.slice(0, 300).replace(/\s+/g, ' '));
  }
  ok('GET /qa SSR contains question title', listHtml.includes(title.split(' in ')[0]));

  const qRes = await get(`${WEB_URL}/qa/${slug}`);
  const qHtml = await qRes.text();
  ok(`GET /qa/${slug} -> 200`, qRes.status === 200);
  if (qRes.status !== 200) {
    console.log('  /qa/:slug status:', qRes.status, 'body:', qHtml.slice(0, 300).replace(/\s+/g, ' '));
  }
  ok('question page SSR contains title', qHtml.includes(title));
  ok('question page SSR contains answer text', qHtml.includes(answerText));
  ok('question page has QAPage JSON-LD', qHtml.includes('QAPage'));

  for (const p of ['/login', '/register', '/qa/ask']) {
    const res = await get(`${WEB_URL}${p}`);
    ok(`GET ${p} -> 200`, res.status === 200);
  }

  // 404 handling for unknown slug
  const missing = await get(`${WEB_URL}/qa/definitely-not-a-real-slug-xyz`);
  ok('unknown question -> 404', missing.status === 404);

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
