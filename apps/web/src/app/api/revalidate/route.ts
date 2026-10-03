import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { SERVER_API_URL } from '@/lib/server';

// Must match ADMIN_COOKIE in apps/api/src/lib/cookies.ts.
const ADMIN_COOKIE = 'umbrella_admin';
const MAX_ITEMS = 40;
const MAX_PATH_LEN = 300;
const TAG_RE = /^[a-zA-Z0-9:._-]{1,80}$/;

/**
 * On-demand cache revalidation, triggered by the API after admin mutations.
 * Auth: the API forwards the caller's admin JWT (Bearer); we verify it
 * server-to-server against the API's /api/auth/admin/me before touching caches.
 * No secrets in env — verification rides on the existing admin session.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) {
    return NextResponse.json({ error: 'Missing admin token' }, { status: 401 });
  }

  let verified = false;
  try {
    const me = await fetch(`${SERVER_API_URL}/api/auth/admin/me`, {
      headers: { cookie: `${ADMIN_COOKIE}=${token}` },
      cache: 'no-store'
    });
    verified = me.ok;
  } catch {
    verified = false;
  }
  if (!verified) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { paths?: unknown; tags?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const rawPaths = Array.isArray(body.paths) ? body.paths : [];
  const rawTags = Array.isArray(body.tags) ? body.tags : [];
  if (rawPaths.length > MAX_ITEMS || rawTags.length > MAX_ITEMS) {
    return NextResponse.json({ error: 'Too many items (max 40 paths / 40 tags)' }, { status: 400 });
  }

  const paths: string[] = [];
  for (const p of rawPaths) {
    if (typeof p !== 'string' || !p.startsWith('/') || p.length > MAX_PATH_LEN) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }
    paths.push(p);
  }
  const tags: string[] = [];
  for (const t of rawTags) {
    if (typeof t !== 'string' || !TAG_RE.test(t)) {
      return NextResponse.json({ error: 'Invalid tag' }, { status: 400 });
    }
    tags.push(t);
  }

  for (const tag of tags) revalidateTag(tag);
  for (const path of paths) {
    // Dynamic-segment patterns (e.g. '/blog/[slug]') purge the whole route group.
    revalidatePath(path, path.includes('[') ? 'page' : undefined);
  }

  return NextResponse.json({ ok: true, paths: paths.length, tags: tags.length });
}
