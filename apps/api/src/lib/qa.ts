// Serialization adapters for Q&A models + nested comment tree building.

export interface CommentNode {
  id: string;
  userId: string | null;
  authorName: string;
  bodyMd: string;
  createdAt: string;
  children: CommentNode[];
}

/**
 * Builds a nested comment tree from a flat list of comments that all belong to
 * a single target (one question, or one answer). Comments must be ordered
 * oldest-first so parents precede children.
 */
export function buildCommentTree(comments: any[]): CommentNode[] {
  const nodes = new Map<string, CommentNode>();
  for (const c of comments) {
    nodes.set(c.id, {
      id: c.id,
      userId: c.userId,
      authorName: c.userId ? c.user?.displayName || c.user?.username || 'Anonymous' : c.authorName || 'Anonymous',
      bodyMd: c.bodyMd,
      createdAt: c.createdAt.toISOString(),
      children: []
    });
  }

  const roots: CommentNode[] = [];
  for (const c of comments) {
    const node = nodes.get(c.id)!;
    if (c.parentId && nodes.has(c.parentId)) {
      nodes.get(c.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export function serializeComment(c: any) {
  return {
    id: c.id,
    userId: c.userId,
    parentId: c.parentId,
    targetType: c.targetType,
    targetId: c.targetId,
    authorName: c.userId ? c.user?.displayName || c.user?.username || 'Anonymous' : c.authorName || 'Anonymous',
    bodyMd: c.bodyMd,
    createdAt: c.createdAt.toISOString()
  };
}

export function serializeQuestion(q: any, extra: { answerCount?: number } = {}) {
  const author = q.user || null;
  return {
    id: q.id,
    slug: q.slug,
    title: q.title,
    bodyMd: q.bodyMd ?? '',
    topic: q.topic,
    viewCount: q.viewCount,
    status: q.status,
    answerCount: q._count?.answers ?? extra.answerCount ?? 0,
    authorId: author ? author.id : null,
    authorName: author ? author.displayName || author.username : null,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString()
  };
}

export function serializeAnswer(a: any) {
  return {
    id: a.id,
    questionId: a.questionId,
    bodyMd: a.bodyMd,
    votes: a.votes,
    isBest: a.isBest,
    authorName: a.user ? a.user.displayName || a.user.username || 'Anonymous' : a.authorName || 'Anonymous',
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    userVote: a.userVote ?? null,
    comments: a.comments ?? null
  };
}
