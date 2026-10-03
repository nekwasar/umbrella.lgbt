/**
 * Ask the Next.js web app to revalidate cached pages/tags after an admin
 * mutation so public edits appear immediately instead of after the TTL
 * (currently 120–300s).
 *
 * Auth: forwards the caller's admin JWT; the web route
 * (apps/web/src/app/api/revalidate/route.ts) verifies it server-to-server
 * against this API's /api/auth/admin/me. No shared secrets involved.
 *
 * Never throws — on failure the site simply falls back to normal TTLs.
 */
const WEB_BASE_URL = (process.env.WEB_BASE_URL || 'https://umbrella.lgbt').replace(/\/+$/, '');
const MAX_ITEMS = 40;

export async function notifyWeb(
  adminToken: string | undefined,
  input: { paths?: string[]; tags?: string[] }
): Promise<void> {
  const paths = [...new Set(input.paths ?? [])].slice(0, MAX_ITEMS);
  const tags = [...new Set(input.tags ?? [])].slice(0, MAX_ITEMS);
  if (!adminToken || (paths.length === 0 && tags.length === 0)) return;
  try {
    const res = await fetch(`${WEB_BASE_URL}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ paths, tags }),
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) {
      console.warn(`[revalidate] web returned ${res.status} — public pages keep TTL staleness`);
    }
  } catch (err) {
    console.warn('[revalidate] notify failed:', err instanceof Error ? err.message : err);
  }
}
