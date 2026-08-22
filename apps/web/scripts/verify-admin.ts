/**
 * Admin smoke verification — starts the API (dist) and the built Next.js app
 * as child processes, then checks the admin routes serve correctly.
 * Run after: npm run build in apps/web and apps/api.
 * Run: npx tsx scripts/verify-admin.ts (from apps/web)
 */
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

const API_PORT = 3000;
const WEB_PORT = 3001;
const API_URL = `http://localhost:${API_PORT}`;
const WEB_URL = `http://localhost:${WEB_PORT}`;

const apiCwd = path.resolve(__dirname, '../../api');

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
      const res = await fetch(url);
      if (res.status < 500) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

async function main() {
  api = spawn('node', ['dist/index.js'], { cwd: apiCwd, stdio: 'ignore', detached: true });
  web = spawn('npx', ['next', 'start', '-p', String(WEB_PORT)], {
    cwd: __dirname + '/..',
    stdio: 'ignore',
    detached: true
  });

  console.log('\nWaiting for API + Web to come up…\n');
  await waitFor(`${API_URL}/health`);
  await waitFor(`${WEB_URL}/admin/login`);

  // API
  const health = await fetch(`${API_URL}/health`);
  const healthBody = await health.json();
  ok('API /health -> 200 + db up', health.status === 200 && healthBody.status === 'ok', healthBody);

  // Web pages
  // Note: /admin/* are client-rendered behind an auth-guard loading shell, so we
  // assert status 200 (content mounts in the browser after /me resolves). The
  // login page + public home render their real markup server-side.
  for (const [path, needle] of [
    ['/', 'Umbrella.lgbt'],
    ['/admin/login', 'Admin console']
  ] as const) {
    const res = await fetch(`${WEB_URL}${path}`);
    const html = await res.text();
    ok(`GET ${path} -> ${res.status} + markup`, res.status === 200 && html.includes(needle), res.status);
  }

  const loginHtml = await (await fetch(`${WEB_URL}/admin/login`)).text();
  ok('login form has Username + Password fields', loginHtml.includes('Username') && loginHtml.includes('Password'));

  for (const path of ['/admin', '/admin/pages', '/admin/pages/new', '/admin/meta', '/admin/admins', '/admin/users']) {
    const res = await fetch(`${WEB_URL}${path}`);
    ok(`GET ${path} -> ${res.status}`, res.status === 200, res.status);
  }

  // Public API still works from the web origin perspective (CORS preflight is browser-side; here just confirm endpoint)
  const sample = await fetch(`${API_URL}/api/pages/blog/umbrella-manifesto`);
  ok('API public page -> 200', sample.status === 200);

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
