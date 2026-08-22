/**
 * End-to-end dynamic Q&A tests (M4).
 *
 * Requires Postgres (DATABASE_URL) + migrations applied.
 * Run: npm run test:e2e:qa
 */
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { ensureSuperAdmin } from '../src/lib/superadmin';

const PORT = 3194;
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

  const json = { 'Content-Type': 'application/json' };

  // admin
  const login = await fetch(`${BASE}/api/auth/admin/login`, {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ username: process.env.SUPERADMIN_USERNAME || 'admin', password: process.env.SUPERADMIN_PASSWORD })
  });
  ok('admin login -> 200', login.status === 200);
  const adminAuth = { Cookie: cookieFrom(login), ...json };

  // users A + B
  const ts = Date.now();
  const nameA = `qa_a_${ts}`;
  const nameB = `qa_b_${ts}`;

  const regA = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ username: nameA, password: 'strongpass123', displayName: 'Alex' })
  });
  const regB = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ username: nameB, password: 'strongpass123', displayName: 'Blair' })
  });
  ok('register user A -> 201', regA.status === 201);
  ok('register user B -> 201', regB.status === 201);
  const authA = { Cookie: cookieFrom(regA), ...json };
  const authB = { Cookie: cookieFrom(regB), ...json };

  console.log('\nE2E QA — server on :' + PORT + '\n');

  // ---- ask question ----
  const title = `How do I come out at school in ${ts}?`;
  let r = await fetch(`${BASE}/api/qa`, { method: 'POST', headers: authA, body: JSON.stringify({ title, bodyMd: '## Context\n\nI am a teenager and need advice.', topic: 'coming-out' }) });
  let body = await r.json();
  ok('ask question -> 201', r.status === 201, body);
  const slug1 = body?.question?.slug;
  ok('question slug auto-generated', typeof slug1 === 'string' && slug1.length > 0, body);

  // duplicate title -> unique slug
  r = await fetch(`${BASE}/api/qa`, { method: 'POST', headers: authA, body: JSON.stringify({ title, bodyMd: '', topic: 'coming-out' }) });
  body = await r.json();
  ok('duplicate title -> unique slug (-2)', r.status === 201 && body?.question?.slug !== slug1, body);
  const slug1b = body?.question?.slug;

  // unauthed ask -> 401
  r = await fetch(`${BASE}/api/qa`, { method: 'POST', headers: json, body: JSON.stringify({ title: 'X'.repeat(20) }) });
  ok('ask without account -> 401', r.status === 401);

  // short title -> 400
  r = await fetch(`${BASE}/api/qa`, { method: 'POST', headers: authA, body: JSON.stringify({ title: 'Hi' }) });
  ok('ask short title -> 400', r.status === 400);

  // ---- list ----
  r = await fetch(`${BASE}/api/qa?topic=coming-out`);
  body = await r.json();
  ok('list by topic -> 200 + contains slug1', r.status === 200 && body.items.some((q: { slug: string }) => q.slug === slug1), body.total);
  ok('list item has answerCount', body.items[0] && 'answerCount' in body.items[0]);

  r = await fetch(`${BASE}/api/qa?q=come%20out%20at%20school`);
  body = await r.json();
  ok('search finds question', r.status === 200 && body.items.some((q: { slug: string }) => q.slug === slug1), body.total);

  // ---- single ----
  r = await fetch(`${BASE}/api/qa/${slug1}`);
  body = await r.json();
  ok('single question -> 200', r.status === 200 && body?.question?.slug === slug1, body);
  ok('viewCount incremented', body?.question?.viewCount >= 1, body?.question?.viewCount);

  // ---- answers ----
  r = await fetch(`${BASE}/api/qa/${slug1}/answers`, { method: 'POST', headers: authB, body: JSON.stringify({ bodyMd: 'Talk to a trusted teacher or counselor first.' }) });
  body = await r.json();
  ok('answer by B -> 201', r.status === 201, body);
  const ansB = body?.answer?.id;

  r = await fetch(`${BASE}/api/qa/${slug1}/answers`, { method: 'POST', headers: authA, body: JSON.stringify({ bodyMd: 'You are not alone. Find a GSA.' }) });
  body = await r.json();
  ok('answer by A -> 201', r.status === 201, body);
  const ansA = body?.answer?.id;

  r = await fetch(`${BASE}/api/qa/${slug1}/answers`, { method: 'POST', headers: json, body: JSON.stringify({ bodyMd: 'anon answer' }) });
  ok('answer without account -> 401', r.status === 401);

  // ---- votes ----
  r = await fetch(`${BASE}/api/answers/${ansB}/vote`, { method: 'POST', headers: json, body: JSON.stringify({ value: 1 }) });
  ok('vote without account -> 401', r.status === 401);

  r = await fetch(`${BASE}/api/answers/${ansB}/vote`, { method: 'POST', headers: authA, body: JSON.stringify({ value: 1 }) });
  body = await r.json();
  ok('A upvotes B -> votes 1', body?.votes === 1 && body?.userVote === 1, body);

  r = await fetch(`${BASE}/api/answers/${ansB}/vote`, { method: 'POST', headers: authA, body: JSON.stringify({ value: 1 }) });
  body = await r.json();
  ok('A upvotes again -> toggles off', body?.votes === 0 && body?.userVote === null, body);

  r = await fetch(`${BASE}/api/answers/${ansB}/vote`, { method: 'POST', headers: authA, body: JSON.stringify({ value: 1 }) });
  body = await r.json();
  ok('A upvotes again -> votes 1', body?.votes === 1, body);

  r = await fetch(`${BASE}/api/answers/${ansB}/vote`, { method: 'POST', headers: authB, body: JSON.stringify({ value: 1 }) });
  body = await r.json();
  ok('B upvotes own? B can vote -> votes 2', body?.votes === 2, body);

  r = await fetch(`${BASE}/api/answers/${ansB}/vote`, { method: 'POST', headers: authB, body: JSON.stringify({ value: -1 }) });
  body = await r.json();
  ok('B changes to downvote -> votes 0', body?.votes === 0 && body?.userVote === -1, body);

  // ---- comments ----
  const qId = (await (await fetch(`${BASE}/api/qa/${slug1}`)).json()).question.id;
  r = await fetch(`${BASE}/api/comments`, { method: 'POST', headers: authA, body: JSON.stringify({ targetType: 'QUESTION', targetId: qId, bodyMd: 'Great question, thanks for asking.' }) });
  body = await r.json();
  ok('A comments on question -> 201', r.status === 201, body);
  const commentQ = body?.comment?.id;

  r = await fetch(`${BASE}/api/comments`, { method: 'POST', headers: authB, body: JSON.stringify({ targetType: 'ANSWER', targetId: ansB, bodyMd: 'Seconding the counselor advice.' }) });
  body = await r.json();
  ok('B comments on answer -> 201', r.status === 201, body);

  // anonymous reply to comment
  r = await fetch(`${BASE}/api/comments`, { method: 'POST', headers: json, body: JSON.stringify({ targetType: 'QUESTION', targetId: qId, parentId: commentQ, bodyMd: 'I agree with this too.', authorName: 'QueerPal' }) });
  body = await r.json();
  ok('anonymous reply to comment -> 201', r.status === 201, body);

  // anonymous reply without name -> 400
  r = await fetch(`${BASE}/api/comments`, { method: 'POST', headers: json, body: JSON.stringify({ targetType: 'QUESTION', targetId: qId, parentId: commentQ, bodyMd: 'no name here' }) });
  ok('anonymous reply without name -> 400', r.status === 400);

  // anonymous top-level comment -> 401
  r = await fetch(`${BASE}/api/comments`, { method: 'POST', headers: json, body: JSON.stringify({ targetType: 'QUESTION', targetId: qId, bodyMd: 'anon top-level', authorName: 'X' }) });
  ok('anonymous top-level comment -> 401', r.status === 401);

  // ---- single with userVotes ----
  r = await fetch(`${BASE}/api/qa/${slug1}`, { headers: authA });
  body = await r.json();
  ok('single with A -> userVotes for ansB = 1', body?.userVotes?.[ansB] === 1, body?.userVotes);
  ok('me is A', body?.me?.username === nameA, body?.me);
  ok('question comments include A + anonymous reply', Array.isArray(body?.questionComments) && body.questionComments.length >= 1 && body.questionComments[0]?.children?.length >= 1, body?.questionComments);

  // ---- pin ----
  r = await fetch(`${BASE}/api/answers/${ansB}/pin`, { method: 'POST', headers: authB, body: JSON.stringify({ isBest: true }) });
  ok('non-author pin -> 403', r.status === 403);

  r = await fetch(`${BASE}/api/answers/${ansB}/pin`, { method: 'POST', headers: authA, body: JSON.stringify({ isBest: true }) });
  ok('author pins B answer -> 200', r.status === 200);

  r = await fetch(`${BASE}/api/qa/${slug1}`);
  body = await r.json();
  ok('pinned answer first + isBest', body?.answers[0]?.id === ansB && body?.answers[0]?.isBest === true, body?.answers?.map((a: { id: string }) => a.id));

  // ---- related + topics ----
  r = await fetch(`${BASE}/api/qa`, { method: 'POST', headers: authA, body: JSON.stringify({ title: `Coming out during holidays ${ts}`, bodyMd: '', topic: 'coming-out' }) });
  body = await r.json();
  const slug2 = body?.question?.slug;

  r = await fetch(`${BASE}/api/qa/${slug1}`);
  body = await r.json();
  ok('related includes same-topic question', Array.isArray(body?.related) && body.related.some((q: { slug: string }) => q.slug === slug2), body?.related);

  r = await fetch(`${BASE}/api/qa/topics`);
  body = await r.json();
  ok('topics includes coming-out', Array.isArray(body?.topics) && body.topics.some((t: { topic: string }) => t.topic === 'coming-out'), body?.topics);

  // ---- admin moderation ----
  r = await fetch(`${BASE}/api/admin/qa/questions/${slug2 === undefined ? '' : (await (await fetch(`${BASE}/api/qa/${slug2}`)).json()).question.id}`, { method: 'DELETE', headers: adminAuth });
  ok('admin removes question -> 200', r.status === 200);

  r = await fetch(`${BASE}/api/qa/${slug2}`);
  ok('removed question -> 404', r.status === 404);

  r = await fetch(`${BASE}/api/admin/qa/comments/${commentQ}`, { method: 'DELETE', headers: adminAuth });
  ok('admin removes comment -> 200', r.status === 200);

  r = await fetch(`${BASE}/api/qa/${slug1}`);
  body = await r.json();
  ok('removed comment gone from question comments', !body.questionComments.some((c: { id: string }) => c.id === commentQ), body.questionComments);

  r = await fetch(`${BASE}/api/admin/qa/answers/${ansA}`, { method: 'DELETE', headers: adminAuth });
  ok('admin removes answer -> 200', r.status === 200);

  r = await fetch(`${BASE}/api/qa/${slug1}`);
  body = await r.json();
  ok('removed answer gone from list', !body.answers.some((a: { id: string }) => a.id === ansA), body.answers?.map((a: { id: string }) => a.id));

  // unauthed admin moderation -> 401
  r = await fetch(`${BASE}/api/admin/qa/questions/${slug1}`, { method: 'DELETE', headers: json });
  ok('admin moderation without auth -> 401', r.status === 401);

  // ---- cleanup ----
  await prisma.user.deleteMany({ where: { username: { in: [nameA, nameB] } } });

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
