// Serialization + validation helpers for bulletins.

export function serializeBulletin(b: any, commentCount: number | null = null) {
  return {
    id: b.id,
    title: b.title,
    bodyMd: b.bodyMd ?? '',
    pinned: b.pinned,
    status: b.status,
    commentCount: commentCount ?? b._count?.comments ?? null,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString()
  };
}
