/**
 * End-to-end admin management tests (M3).
 *
 * Requires a reachable Postgres (DATABASE_URL), SUPERADMIN_PASSWORD, and migrations applied.
 * Run: npm run test:e2e:admin
 */
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { ensureSuperAdmin } from '../src/lib/superadmin';

const PORT = 3195;
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

async function login(username: string, password: string) {
  const r = await fetch(`${BASE}/api/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  return { r, cookie: cookieFrom(r) };
}

async function main() {
  await ensureSuperAdmin();
  const app = createApp();
  const server = app.listen(PORT);
  await new Promise<void>((r) => server.once('listening', r));

  const superUsername = process.env.SUPERADMIN_USERNAME || 'admin';
  const superPassword = process.env.SUPERADMIN_PASSWORD || '';
  const { r: loginRes, cookie: superCookie } = await login(superUsername, superPassword);
  ok('superadmin login -> 200', loginRes.status === 200);
  const superAuth = { Cookie: superCookie, 'Content-Type': 'application/json' };

  console.log('\nE2E ADMIN — server on :' + PORT + '\n');

  // ---- stats ----
  let r = await fetch(`${BASE}/api/admin/stats`, { headers: superAuth });
  let body = await r.json();
  ok('stats -> 200 + pages.total >= 156', r.status === 200 && body?.pages?.total >= 156, body?.pages?.total);

  // ---- create admin ----
  const ts = Date.now();
  const subUsername = `editor_${ts}`;
  r = await fetch(`${BASE}/api/admin/admins`, {
    method: 'POST',
    headers: superAuth,
    body: JSON.stringify({ username: subUsername, password: 'subadmin-pass-1234' })
  });
  body = await r.json();
  ok('superadmin creates admin -> 201', r.status === 201, body);
  ok('created admin role defaults ADMIN', body?.admin?.role === 'ADMIN', body);
  const subId = body?.admin?.id;

  // duplicate
  r = await fetch(`${BASE}/api/admin/admins`, {
    method: 'POST',
    headers: superAuth,
    body: JSON.stringify({ username: subUsername, password: 'subadmin-pass-1234' })
  });
  ok('create duplicate admin -> 409', r.status === 409);

  // weak password
  r = await fetch(`${BASE}/api/admin/admins`, {
    method: 'POST',
    headers: superAuth,
    body: JSON.stringify({ username: `weak_${ts}`, password: 'short' })
  });
  ok('create admin weak password -> 400', r.status === 400);

  // ---- new admin can log in and read list, but cannot create ----
  const { r: subLogin, cookie: subCookie } = await login(subUsername, 'subadmin-pass-1234');
  ok('new admin login -> 200', subLogin.status === 200);
  const subAuth = { Cookie: subCookie, 'Content-Type': 'application/json' };

  r = await fetch(`${BASE}/api/admin/admins`, { headers: subAuth });
  ok('admin can list admins -> 200', r.status === 200);

  r = await fetch(`${BASE}/api/admin/admins`, {
    method: 'POST',
    headers: subAuth,
    body: JSON.stringify({ username: `nope_${ts}`, password: 'subadmin-pass-1234' })
  });
  ok('non-super cannot create admin -> 403', r.status === 403);

  r = await fetch(`${BASE}/api/admin/stats`, { headers: subAuth });
  ok('admin can read stats -> 200', r.status === 200);

  // ---- self password change (requires current) ----
  r = await fetch(`${BASE}/api/admin/admins/${subId}/password`, {
    method: 'PATCH',
    headers: subAuth,
    body: JSON.stringify({ newPassword: 'newpass-12345' })
  });
  ok('self password change without current -> 400', r.status === 400);

  r = await fetch(`${BASE}/api/admin/admins/${subId}/password`, {
    method: 'PATCH',
    headers: subAuth,
    body: JSON.stringify({ currentPassword: 'wrong-current', newPassword: 'newpass-12345' })
  });
  ok('self password change wrong current -> 401', r.status === 401);

  r = await fetch(`${BASE}/api/admin/admins/${subId}/password`, {
    method: 'PATCH',
    headers: subAuth,
    body: JSON.stringify({ currentPassword: 'subadmin-pass-1234', newPassword: 'newpass-12345' })
  });
  ok('self password change -> 200', r.status === 200);

  // ---- role change ----
  r = await fetch(`${BASE}/api/admin/admins/${subId}/role`, {
    method: 'PATCH',
    headers: subAuth,
    body: JSON.stringify({ role: 'SUPER_ADMIN' })
  });
  ok('non-super cannot change role -> 403', r.status === 403);

  r = await fetch(`${BASE}/api/admin/admins/${subId}/role`, {
    method: 'PATCH',
    headers: superAuth,
    body: JSON.stringify({ role: 'SUPER_ADMIN' })
  });
  ok('superadmin promotes admin -> 200', r.status === 200);

  // ---- users list + ban ----
  const username = `moduser_${ts}`;
  const reg = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'strongpass123' })
  });
  ok('register test user -> 201', reg.status === 201);
  const regBody = await reg.json();
  const userId = regBody?.user?.id;

  r = await fetch(`${BASE}/api/admin/users?q=${username}`, { headers: superAuth });
  body = await r.json();
  ok('users list finds user -> 200', r.status === 200 && body?.items?.some((u: { id: string }) => u.id === userId), body);

  r = await fetch(`${BASE}/api/admin/users/${userId}`, {
    method: 'PATCH',
    headers: superAuth,
    body: JSON.stringify({ isBanned: true })
  });
  ok('ban user -> 200', r.status === 200);

  // banned user cannot login / me
  const bannedLogin = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'strongpass123' })
  });
  ok('banned user login -> 403', bannedLogin.status === 403);

  r = await fetch(`${BASE}/api/admin/users/${userId}`, {
    method: 'PATCH',
    headers: superAuth,
    body: JSON.stringify({ isBanned: false })
  });
  ok('unban user -> 200', r.status === 200);

  // ---- superadmin cannot delete self ----
  const list = await fetch(`${BASE}/api/admin/admins`, { headers: superAuth });
  const listBody = await list.json();
  const superId = listBody.admins.find((a: { username: string }) => a.username === superUsername)?.id;
  const delSelf = await fetch(`${BASE}/api/admin/admins/${superId}`, { method: 'DELETE', headers: superAuth });
  ok('superadmin cannot delete self -> 400', delSelf.status === 400);

  // ---- cleanup ----
  await fetch(`${BASE}/api/admin/admins/${subId}`, { method: 'DELETE', headers: superAuth });
  await prisma.user.deleteMany({ where: { id: userId } });

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
