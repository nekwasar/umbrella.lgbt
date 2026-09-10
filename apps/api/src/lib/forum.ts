// Serialization adapters for forum models.

export interface AuthorInfo {
  id: string;
  username: string;
  displayName: string | null;
  createdAt: string;
  postCount: number;
}

export function serializeBoard(b: any) {
  return {
    id: b.id,
    category: b.category,
    name: b.name,
    slug: b.slug,
    description: b.description ?? '',
    topicCount: b._count?.topics ?? 0,
    postCount: b.postCount ?? 0,
    lastPost: b.lastPost ?? null
  };
}

export function serializeTopic(t: any) {
  return {
    id: t.id,
    boardId: t.boardId,
    boardSlug: t.board?.slug ?? null,
    boardName: t.board?.name ?? null,
    title: t.title,
    status: t.status,
    pinned: t.pinned,
    locked: t.locked,
    viewCount: t.viewCount,
    replyCount: Math.max(0, (t._count?.posts ?? t.postCount ?? 1) - 1),
    postCount: t._count?.posts ?? t.postCount ?? 0,
    authorName: t.user ? t.user.displayName || t.user.username : null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    lastPost: t.lastPost ?? null
  };
}

export function serializePost(p: any, authorPostCounts: Record<string, number> = {}) {
  const u = p.user || null;
  return {
    id: p.id,
    topicId: p.topicId,
    bodyMd: p.bodyMd ?? '',
    status: p.status,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    author: u
      ? {
          id: u.id,
          username: u.username,
          displayName: u.displayName || null,
          createdAt: u.createdAt.toISOString(),
          postCount: authorPostCounts[u.id] ?? 0
        }
      : null
  };
}
