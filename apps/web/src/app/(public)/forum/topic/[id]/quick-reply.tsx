'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, toApiError, ApiError } from '@/lib/api';
import { useUser } from '@/components/public/UserProvider';
import { QUOTE_EVENT } from './post-actions';

export function QuickReply({ topicId }: { topicId: string }) {
  const { user, loading } = useUser();
  const router = useRouter();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    function onQuote(e: Event) {
      const prefill = (e as CustomEvent<{ prefill: string }>).detail?.prefill ?? '';
      setBody((prev) => (prev ? `${prev}\n${prefill}` : prefill));
      boxRef.current?.focus();
    }
    window.addEventListener(QUOTE_EVENT, onQuote);
    return () => window.removeEventListener(QUOTE_EVENT, onQuote);
  }, []);

  if (loading) return null;

  if (!user) {
    return (
      <div className="alert alert-error">
        NOTE: To reply or join the discussion, please <Link href="/register">Register</Link> or{' '}
        <Link href="/login">Login</Link>.
      </div>
    );
  }

  async function submit() {
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/forum/topic/${topicId}/posts`, {
        method: 'POST',
        body: JSON.stringify({ bodyMd: body.trim() })
      });
      setBody('');
      setBusy(false);
      router.refresh();
    } catch (err) {
      setError(toApiError(err, 'POST', `/api/forum/topic/${topicId}/posts`));
      setBusy(false);
    }
  }

  return (
    <div id="quick-reply" className="card-flat" style={{ marginTop: 12 }}>
      <label className="label" htmlFor="quick-reply-box">
        Quick reply as {user.displayName || user.username} (markdown ok)
      </label>
      <textarea
        id="quick-reply-box"
        ref={boxRef}
        className="textarea"
        rows={4}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a reply…"
      />
      {error ? (
        <div className="alert alert-error" style={{ marginTop: 6 }}>
          {error.summary}
        </div>
      ) : null}
      <div style={{ marginTop: 8 }}>
        <button className="btn btn-solid" disabled={busy} onClick={submit}>
          {busy ? 'Posting…' : 'Post Reply'}
        </button>
      </div>
    </div>
  );
}
