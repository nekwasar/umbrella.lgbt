'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { mdToHtml } from '@/lib/sanitize';
import { AnswerDetail, CommentNode, QuestionDetail } from '@/lib/types';
import { useUser } from '@/components/public/UserProvider';

export function QuestionView({ initial }: { initial: QuestionDetail }) {
  const { user } = useUser();
  const [data, setData] = useState<QuestionDetail>(initial);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const fresh = await api<QuestionDetail>(`/api/qa/${initial.question.slug}`);
      setData(fresh);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to refresh');
    }
  }

  const { question, answers, questionComments, related } = data;
  const me = user ? { id: user.id, username: user.username } : null;
  const canPin = !!me && me.id === question.authorId;

  async function vote(answer: AnswerDetail, value: 1 | -1) {
    const prev = answer.userVote;
    const newUserVote = value === prev ? null : value;
    setData((d) => ({
      ...d,
      answers: d.answers.map((a) =>
        a.id === answer.id
          ? { ...a, userVote: newUserVote, votes: a.votes + (newUserVote ?? 0) - (prev ?? 0) }
          : a
      )
    }));
    try {
      const res = await api<{ votes: number; userVote: number | null }>(
        `/api/answers/${answer.id}/vote`,
        { method: 'POST', body: JSON.stringify({ value }) }
      );
      setData((d) => ({
        ...d,
        answers: d.answers.map((a) =>
          a.id === answer.id ? { ...a, votes: res.votes, userVote: res.userVote } : a
        )
      }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Vote failed');
      refresh();
    }
  }

  async function pin(answer: AnswerDetail, isBest: boolean) {
    try {
      await api(`/api/answers/${answer.id}/pin`, {
        method: 'POST',
        body: JSON.stringify({ isBest })
      });
      setError(null);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Pin failed');
    }
  }

  return (
    <article style={{ maxWidth: 760, margin: '0 auto' }}>
      {error ? <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div> : null}

      <header style={{ marginBottom: 12 }}>
        {question.topic ? <span className="tag tag-pink" style={{ marginBottom: 6 }}>{question.topic}</span> : null}
        <h1 style={{ fontSize: 24, margin: '4px 0 6px' }}>{question.title}</h1>
        <p className="meta" style={{ margin: 0 }}>
          {question.authorName ? `asked by ${question.authorName} · ` : ''}
          {new Date(question.createdAt).toLocaleDateString()} · {question.viewCount} views ·{' '}
          {answers.length} answer{answers.length === 1 ? '' : 's'}
        </p>
      </header>

      {question.bodyMd ? (
        <div className="card-flat md-preview" style={{ padding: '12px 14px' }} dangerouslySetInnerHTML={{ __html: mdToHtml(question.bodyMd) }} />
      ) : null}

      {/* comments on the question */}
      <section style={{ marginTop: 14 }}>
        <div className="band" style={{ marginBottom: 8 }}>
          Comments
        </div>
        <TopCommentComposer targetType="QUESTION" targetId={question.id} refresh={refresh} />
        <CommentTree nodes={questionComments} targetType="QUESTION" targetId={question.id} refresh={refresh} />
      </section>

      {/* answers */}
      <section style={{ marginTop: 16 }}>
        <div className="band rainbow" style={{ marginBottom: 10 }}>
          {answers.length} Answer{answers.length === 1 ? '' : 's'}
        </div>

        {answers.length === 0 ? (
          <div className="card-flat" style={{ textAlign: 'center', padding: '24px 12px' }}>
            <p className="muted" style={{ margin: 0 }}>
              No answers yet. Be the first to help.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {answers.map((answer) => (
              <AnswerCard
                key={answer.id}
                answer={answer}
                canPin={canPin}
                onVote={vote}
                onPin={pin}
                refresh={refresh}
              />
            ))}
          </div>
        )}
      </section>

      {/* answer form */}
      <AnswerForm slug={question.slug} refresh={refresh} />

      {related.length > 0 ? (
        <aside style={{ marginTop: 18 }}>
          <div className="band">Related questions</div>
          <div className="row-list" style={{ borderTop: 'none' }}>
            {related.map((r) => (
              <Link key={r.id} href={`/qa/${r.slug}`}>
                <span style={{ fontWeight: 600 }}>{r.title}</span>
              </Link>
            ))}
          </div>
        </aside>
      ) : null}
    </article>
  );
}

function AnswerCard({
  answer,
  canPin,
  onVote,
  onPin,
  refresh
}: {
  answer: AnswerDetail;
  canPin: boolean;
  onVote: (a: AnswerDetail, v: 1 | -1) => void;
  onPin: (a: AnswerDetail, isBest: boolean) => void;
  refresh: () => void;
}) {
  const { user } = useUser();
  const pathname = usePathname();
  const [showReply, setShowReply] = useState(false);

  return (
    <div className={`card ${answer.isBest ? 'rainbow-frame' : ''}`} style={answer.isBest ? { padding: '8px 12px' } : undefined}>
      <div style={{ display: 'flex', gap: 12 }}>
        <VoteButtons answer={answer} onVote={onVote} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {answer.isBest ? <span className="tag tag-green">Best answer</span> : null}
            <span className="meta">
              {answer.authorName} · {new Date(answer.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="md-preview" style={{ marginTop: 6 }} dangerouslySetInnerHTML={{ __html: mdToHtml(answer.bodyMd) }} />

          <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
            <button className="btn" onClick={() => setShowReply((s) => !s)}>
              {showReply ? 'Cancel' : 'Reply'}
            </button>
            {canPin ? (
              <button className="btn" onClick={() => onPin(answer, !answer.isBest)}>
                {answer.isBest ? 'Unpin' : 'Mark as best'}
              </button>
            ) : null}
          </div>

          {showReply ? (
            <div style={{ marginTop: 8 }}>
              {user ? (
                <ReplyComposer
                  targetType="ANSWER"
                  targetId={answer.id}
                  parentId={answer.id}
                  refresh={refresh}
                  onDone={() => setShowReply(false)}
                  answerRoot
                />
              ) : (
                <p className="meta" style={{ margin: 0 }}>
                  <Link href={`/login?next=${encodeURIComponent(pathname)}`}>Sign in</Link> to comment on
                  an answer. Anonymous users can reply to comments below.
                </p>
              )}
            </div>
          ) : null}

          {answer.comments.length > 0 ? (
            <div style={{ marginTop: 10, borderLeft: '2px solid var(--line)', paddingLeft: 10 }}>
              <CommentTree nodes={answer.comments} targetType="ANSWER" targetId={answer.id} refresh={refresh} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function VoteButtons({ answer, onVote }: { answer: AnswerDetail; onVote: (a: AnswerDetail, v: 1 | -1) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
      <button
        onClick={() => onVote(answer, 1)}
        aria-label="Upvote"
        className="btn"
        style={{ fontSize: 14, lineHeight: 1, padding: '1px 7px', color: answer.userVote === 1 ? 'var(--pink)' : undefined, borderColor: answer.userVote === 1 ? 'var(--pink)' : undefined }}
      >
        ↑
      </button>
      <span style={{ fontWeight: 800 }}>{answer.votes}</span>
      <button
        onClick={() => onVote(answer, -1)}
        aria-label="Downvote"
        className="btn"
        style={{ fontSize: 14, lineHeight: 1, padding: '1px 7px', color: answer.userVote === -1 ? 'var(--pink)' : undefined, borderColor: answer.userVote === -1 ? 'var(--pink)' : undefined }}
      >
        ↓
      </button>
    </div>
  );
}

function AnswerForm({ slug, refresh }: { slug: string; refresh: () => void }) {
  const { user } = useUser();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/qa/${slug}/answers`, {
        method: 'POST',
        body: JSON.stringify({ bodyMd: body })
      });
      setBody('');
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to post answer');
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <div className="card-flat" style={{ marginTop: 16, textAlign: 'center', padding: '22px 12px' }}>
        <p className="muted" style={{ margin: 0 }}>
          <Link href={`/login?next=/qa/${slug}`}>Sign in</Link> to share an answer. You can read
          everything without an account.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card" style={{ marginTop: 16 }}>
      <div className="band" style={{ margin: '-8px -12px 10px' }}>
        Your answer
      </div>
      {error ? <div className="alert alert-error" style={{ marginBottom: 8 }}>{error}</div> : null}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={5}
        placeholder="Share what you know… (Markdown supported)"
        className="textarea"
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button type="submit" disabled={busy || !body.trim()} className="btn btn-solid">
          {busy ? 'Posting…' : 'Post answer'}
        </button>
      </div>
    </form>
  );
}

function TopCommentComposer({
  targetType,
  targetId,
  refresh
}: {
  targetType: 'QUESTION' | 'ANSWER';
  targetId: string;
  refresh: () => void;
}) {
  const { user } = useUser();
  const pathname = usePathname();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <p className="meta" style={{ marginBottom: 8 }}>
        <Link href={`/login?next=${encodeURIComponent(pathname)}`}>Sign in</Link> to comment.
      </p>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api('/api/comments', {
        method: 'POST',
        body: JSON.stringify({ targetType, targetId, bodyMd: body })
      });
      setBody('');
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to comment');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={1}
        placeholder="Add a comment…"
        className="textarea"
        style={{ flex: 1 }}
      />
      <button type="submit" disabled={busy || !body.trim()} className="btn btn-solid">
        {busy ? '…' : 'Comment'}
      </button>
      {error ? <span style={{ color: '#a11c22', fontSize: 11 }}>{error}</span> : null}
    </form>
  );
}

function CommentTree({
  nodes,
  targetType,
  targetId,
  refresh
}: {
  nodes: CommentNode[];
  targetType: 'QUESTION' | 'ANSWER';
  targetId: string;
  refresh: () => void;
}) {
  if (nodes.length === 0) return null;
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
      {nodes.map((node) => (
        <CommentItem key={node.id} node={node} targetType={targetType} targetId={targetId} refresh={refresh} />
      ))}
    </ul>
  );
}

function CommentItem({
  node,
  targetType,
  targetId,
  refresh
}: {
  node: CommentNode;
  targetType: 'QUESTION' | 'ANSWER';
  targetId: string;
  refresh: () => void;
}) {
  const [replying, setReplying] = useState(false);
  return (
    <li style={{ border: '1px solid var(--line)', background: 'var(--surface-2)', padding: '6px 8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700 }}>{node.authorName}</span>
        <span className="meta" style={{ fontSize: 10 }}>
          {new Date(node.createdAt).toLocaleDateString()}
        </span>
      </div>
      <div className="md-preview" style={{ margin: '3px 0' }} dangerouslySetInnerHTML={{ __html: mdToHtml(node.bodyMd) }} />
      <button className="btn" style={{ fontSize: 11, padding: '0 6px' }} onClick={() => setReplying((s) => !s)}>
        {replying ? 'Cancel' : 'Reply'}
      </button>
      {replying ? (
        <div style={{ marginTop: 6 }}>
          <ReplyComposer
            targetType={targetType}
            targetId={targetId}
            parentId={node.id}
            refresh={refresh}
            onDone={() => setReplying(false)}
          />
        </div>
      ) : null}
      {node.children.length > 0 ? (
        <div style={{ marginTop: 6, borderLeft: '2px solid var(--line)', paddingLeft: 8 }}>
          <CommentTree nodes={node.children} targetType={targetType} targetId={targetId} refresh={refresh} />
        </div>
      ) : null}
    </li>
  );
}

function ReplyComposer({
  targetType,
  targetId,
  parentId,
  refresh,
  onDone,
  answerRoot
}: {
  targetType: 'QUESTION' | 'ANSWER';
  targetId: string;
  parentId: string;
  refresh: () => void;
  onDone: () => void;
  answerRoot?: boolean;
}) {
  const { user } = useUser();
  const [body, setBody] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveParent = answerRoot ? undefined : parentId;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    if (!user && !name.trim()) {
      setError('Please enter a name to reply.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api('/api/comments', {
        method: 'POST',
        body: JSON.stringify({
          targetType,
          targetId,
          parentId: effectiveParent,
          bodyMd: body,
          authorName: user ? undefined : name
        })
      });
      setBody('');
      setName('');
      await refresh();
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to reply');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 6 }}>
      {!user ? (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name (optional, shown publicly)"
          className="input"
          style={{ width: 220 }}
        />
      ) : null}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        placeholder="Write a reply…"
        className="textarea"
      />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button type="submit" disabled={busy || !body.trim()} className="btn btn-solid">
          {busy ? 'Posting…' : 'Reply'}
        </button>
        {error ? <span style={{ color: '#a11c22', fontSize: 11 }}>{error}</span> : null}
      </div>
    </form>
  );
}
