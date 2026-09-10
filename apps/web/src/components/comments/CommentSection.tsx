'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { api, toApiError, ApiError } from '@/lib/api';
import { useUser } from '@/components/public/UserProvider';
import { mdToHtml, mdToText } from '@/lib/sanitize';
import { timeAgo } from '@/lib/time';

export interface CommentNode {
  id: string;
  userId: string | null;
  authorName: string;
  bodyMd: string;
  createdAt: string;
  children: CommentNode[];
}

function Avatar({ name }: { name: string }) {
  const initial = (name.trim()[0] || '?').toUpperCase();
  return (
    <span className="avatar" aria-hidden="true">
      {initial}
    </span>
  );
}

function CommentCard({
  comment,
  depth,
  targetLabel,
  onQuote,
  refresh
}: {
  comment: CommentNode;
  depth: number;
  targetLabel: string;
  onQuote: (author: string, bodyMd: string) => void;
  refresh: () => Promise<void>;
}) {
  const { user } = useUser();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [replyName, setReplyName] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [reported, setReported] = useState(false);

  async function submitReply() {
    if (!replyBody.trim()) return;
    if (!user && !replyName.trim()) {
      setError(toApiError(new Error('Please enter a name to reply'), 'POST', '/api/comments'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api('/api/comments', {
        method: 'POST',
        body: JSON.stringify({
          parentId: comment.id,
          bodyMd: replyBody.trim(),
          ...(user ? {} : { authorName: replyName.trim() })
        })
      });
      setReplyBody('');
      setReplyName('');
      setReplyOpen(false);
      await refresh();
    } catch (err) {
      setError(toApiError(err, 'POST', '/api/comments'));
      setBusy(false);
    }
  }

  async function submitReport() {
    if (reason.trim().length < 5) {
      setError(toApiError(new Error('Please describe the problem (min 5 characters)'), 'POST', '/api/reports'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api('/api/reports', {
        method: 'POST',
        body: JSON.stringify({ targetType: 'COMMENT', targetId: comment.id, reason: reason.trim() })
      });
      setReported(true);
      setReportOpen(false);
      setReason('');
      setBusy(false);
    } catch (err) {
      setError(toApiError(err, 'POST', '/api/reports'));
      setBusy(false);
    }
  }

  return (
    <div className="comment-card">
      <div className="comment-head">
        <Avatar name={comment.authorName} />
        <span className="comment-name">{comment.authorName}</span>
        <span className="meta">posted {timeAgo(comment.createdAt)}</span>
      </div>
      <div
        className="comment-body md-preview"
        dangerouslySetInnerHTML={{ __html: mdToHtml(comment.bodyMd) }}
      />
      <div className="comment-actions">
        <button className="linklike" onClick={() => { setReplyOpen((v) => !v); setReportOpen(false); }}>
          Reply
        </button>
        <span aria-hidden="true"> · </span>
        <button className="linklike" onClick={() => onQuote(comment.authorName, comment.bodyMd)}>
          Quote
        </button>
        <span aria-hidden="true"> · </span>
        {user ? (
          reported ? (
            <span className="meta">Reported — thanks</span>
          ) : (
            <button className="linklike" onClick={() => { setReportOpen((v) => !v); setReplyOpen(false); }}>
              Report
            </button>
          )
        ) : (
          <Link href="/login">Report</Link>
        )}
      </div>
      {error ? <div className="alert alert-error">{error.summary}</div> : null}
      {replyOpen ? (
        <div className="comment-form" style={{ marginTop: 8 }}>
          {!user ? (
            <input
              className="input"
              placeholder="Your name"
              value={replyName}
              onChange={(e) => setReplyName(e.target.value)}
              maxLength={60}
              style={{ marginBottom: 6 }}
            />
          ) : null}
          <textarea
            className="textarea"
            rows={3}
            placeholder={user ? `Reply to ${comment.authorName}…` : 'Write a reply… (no account needed)'}
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
          />
          <div style={{ marginTop: 6 }}>
            <button className="btn btn-solid" disabled={busy} onClick={submitReply}>
              {busy ? 'Posting…' : 'Post Reply'}
            </button>
          </div>
        </div>
      ) : null}
      {reportOpen && user ? (
        <div className="comment-form" style={{ marginTop: 8 }}>
          <input
            className="input"
            placeholder="Reason (min 5 characters)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            style={{ marginBottom: 6 }}
          />
          <button className="btn" disabled={busy} onClick={submitReport}>
            {busy ? 'Sending…' : 'Send Report'}
          </button>
        </div>
      ) : null}
      {comment.children.length > 0 ? (
        <div className="comment-replies">
          {comment.children.map((child) => (
            <CommentCard
              key={child.id}
              comment={child}
              depth={depth + 1}
              targetLabel={targetLabel}
              onQuote={onQuote}
              refresh={refresh}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CommentSection({
  targetType,
  targetId
}: {
  targetType: 'PAGE' | 'QUESTION' | 'ANSWER';
  targetId: string;
}) {
  const { user, loading } = useUser();
  const [tree, setTree] = useState<CommentNode[]>([]);
  const [total, setTotal] = useState(0);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<ApiError | null>(null);
  const [sort, setSort] = useState<'new' | 'old'>('old');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await api<{ total: number; comments: CommentNode[] }>(
        `/api/comments?targetType=${targetType}&targetId=${encodeURIComponent(targetId)}`
      );
      setTree(res.comments);
      setTotal(res.total);
      setFetchError(null);
    } catch (err) {
      setFetchError(toApiError(err, 'GET', '/api/comments'));
    } finally {
      setFetching(false);
    }
  }, [targetType, targetId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const roots = useMemo(() => {
    const list = [...tree];
    list.sort((a, b) =>
      sort === 'new'
        ? +new Date(b.createdAt) - +new Date(a.createdAt)
        : +new Date(a.createdAt) - +new Date(b.createdAt)
    );
    return list;
  }, [tree, sort]);

  function handleQuote(author: string, bodyMd: string) {
    const excerpt = mdToText(bodyMd, 200);
    const quoted = excerpt
      .split('\n')
      .map((l) => `> ${l}`)
      .join('\n');
    setBody(`${quoted}\n\n@${author} `);
    boxRef.current?.focus();
    boxRef.current?.scrollIntoView({ block: 'nearest' });
  }

  async function submit() {
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api('/api/comments', {
        method: 'POST',
        body: JSON.stringify({ targetType, targetId, bodyMd: body.trim() })
      });
      setBody('');
      setBusy(false);
      await refresh();
    } catch (err) {
      setError(toApiError(err, 'POST', '/api/comments'));
      setBusy(false);
    }
  }

  return (
    <section aria-label="Comments" style={{ marginTop: 18 }}>
      <div className="band">
        {fetching ? 'Comments' : `${total} Comment${total === 1 ? '' : 's'}`}
        <span className="band-link">
          <button className="linklike" onClick={() => setSort('old')} style={{ fontWeight: sort === 'old' ? 700 : 400 }}>
            Oldest
          </button>
          {' / '}
          <button className="linklike" onClick={() => setSort('new')} style={{ fontWeight: sort === 'new' ? 700 : 400 }}>
            Newest
          </button>
        </span>
      </div>

      <div className="comment-list">
        {fetching ? (
          <p className="muted">Loading comments…</p>
        ) : fetchError ? (
          <div className="alert alert-error">{fetchError.summary}</div>
        ) : roots.length === 0 ? (
          <p className="muted" style={{ fontStyle: 'italic' }}>
            No comments yet. Be the first to chime in.
          </p>
        ) : (
          roots.map((c) => (
            <CommentCard key={c.id} comment={c} depth={0} targetLabel={targetType} onQuote={handleQuote} refresh={refresh} />
          ))
        )}
      </div>

      {loading ? null : user ? (
        <div className="comment-form card-flat" style={{ marginTop: 10 }}>
          <label className="label" htmlFor="comment-box">
            Comment as {user.displayName || user.username} (markdown ok)
          </label>
          <textarea
            id="comment-box"
            ref={boxRef}
            className="textarea"
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share your thoughts…"
          />
          {error ? (
            <div className="alert alert-error" style={{ marginTop: 6 }}>
              {error.summary}
            </div>
          ) : null}
          <div style={{ marginTop: 8 }}>
            <button className="btn btn-solid" disabled={busy} onClick={submit}>
              {busy ? 'Posting…' : 'Post Comment'}
            </button>
          </div>
        </div>
      ) : (
        <div className="alert alert-error" style={{ marginTop: 10 }}>
          NOTE: To leave a comment or join the conversation, please{' '}
          <Link href="/register">Register</Link> or <Link href="/login">Login</Link>.
        </div>
      )}
    </section>
  );
}
