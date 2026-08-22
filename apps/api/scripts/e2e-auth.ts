/**
 * End-to-end auth tests.
 *
 * Requires a reachable Postgres (DATABASE_URL) and SUPERADMIN_PASSWORD set.
 * Run: npm run test:e2e
 *
 * Starts the real app on an ephemeral port, exercises the full auth flow via fetch,
 * prints PASS/FAIL per case and exits non-zero on any failure.
 */
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { ensureSuperAdmin } from '../src/lib/superadmin';

const PORT = 3199;
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
  if (!setCookie) return '';
  return setCookie.split(';')[0];
}

async function main() {
  await ensureSuperAdmin();
  const app = createApp();
  const server = app.listen(PORT);
  await new Promise<void>((r) => server.once('listening', r));

  console.log(`\nE2E AUTH — server on :${PORT}\n`);

  // ---- health ----
  let res = await fetch(`${BASE}/health`);
  let body = await res.json();
  ok('GET /health -> 200 + db up', res.status === 200 && body.status === 'ok', body);

  // ---- admin auth ----
  res = await fetch(`${BASE}/api/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: process.env.SUPERADMIN_USERNAME || 'admin', password: process.env.SUPERADMIN_PASSWORD })
  });
  body = await res.json();
  ok('admin login -> 200', res.status === 200, body);
  ok('admin login -> role SUPER_ADMIN', body?.admin?.role === 'SUPER_ADMIN', body);
  const adminCookie = cookieFrom(res);
  ok('admin login -> set-cookie present', adminCookie.length > 0);

  res = await fetch(`${BASE}/api/auth/admin/me`, { headers: { Cookie: adminCookie } });
  body = await res.json();
  ok('admin /me with cookie -> 200', res.status === 200 && body?.admin?.username === (process.env.SUPERADMIN_USERNAME || 'admin'), body);

  res = await fetch(`${BASE}/api/auth/admin/me`);
  ok('admin /me without cookie -> 401', res.status === 401);

  res = await fetch(`${BASE}/api/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'definitely-wrong' })
  });
  ok('admin login wrong password -> 401', res.status === 401);

  res = await fetch(`${BASE}/api/auth/admin/logout`, { method: 'POST', headers: { Cookie: adminCookie } });
  ok('admin logout -> 200', res.status === 200);

  // ---- user register / login ----
  const ts = Date.now();
  const username = `tester_${ts}`;

  res = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'strongpass123', displayName: 'Test User', pronouns: 'they/them' })
  });
  body = await res.json();
  ok('register new user -> 201', res.status === 201, body);
  ok('register -> returns username', body?.user?.username === username, body);
  ok('register -> sets cookie', cookieFrom(res).length > 0);

  res = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'strongpass123' })
  });
  ok('register duplicate username -> 409', res.status === 409);

  res = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'bad username!', password: 'strongpass123' })
  });
  ok('register invalid username chars -> 400', res.status === 400);

  res = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: `short_${ts}`, password: 'short' })
  });
  ok('register short password -> 400', res.status === 400);

  // login and confirm session
  res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'strongpass123' })
  });
  body = await res.json();
  ok('user login -> 200', res.status === 200, body);
  const loggedCookie = cookieFrom(res);

  res = await fetch(`${BASE}/api/auth/me`, { headers: { Cookie: loggedCookie } });
  body = await res.json();
  ok('user /me with cookie -> 200', res.status === 200 && body?.user?.username === username, body);

  res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'wrongpass123' })
  });
  ok('user login wrong password -> 401', res.status === 401);

  res = await fetch(`${BASE}/api/auth/logout`, { method: 'POST', headers: { Cookie: loggedCookie } });
  ok('user logout -> 200', res.status === 200);

  // ---- unknown api route ----
  res = await fetch(`${BASE}/api/nope`);
  ok('unknown api route -> 404', res.status === 404);

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
