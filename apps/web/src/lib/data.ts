import { SERVER_API_URL } from './server';
import { Page, PageListResponse } from './types';

export const DEFAULT_REVALIDATE = 300;

export async function apiFetch<T>(
  path: string,
  revalidate = DEFAULT_REVALIDATE,
  tags: string[] = []
): Promise<T | null> {
  try {
    const res = await fetch(`${SERVER_API_URL}${path}`, { next: { revalidate, tags } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function fetchPublicPage(type: string, slug: string) {
  return apiFetch<{ page: Page; related: Page[]; crossLinks?: Page[] }>(
    `/api/pages/${type}/${slug}`,
    DEFAULT_REVALIDATE,
    ['pages']
  );
}

export function fetchPageList(
  type: string,
  opts: { q?: string; page?: number; pageSize?: number } = {}
) {
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  if (opts.q) params.set('q', opts.q);
  params.set('page', String(opts.page ?? 1));
  params.set('pageSize', String(opts.pageSize ?? 100));
  return apiFetch<PageListResponse>(`/api/pages?${params.toString()}`, DEFAULT_REVALIDATE, ['pages']);
}

export function fetchTypeCount(type: string): Promise<number | null> {
  return apiFetch<PageListResponse>(`/api/pages?type=${type}&pageSize=1`, DEFAULT_REVALIDATE, [
    'pages'
  ]).then((r) => r?.total ?? null);
}
