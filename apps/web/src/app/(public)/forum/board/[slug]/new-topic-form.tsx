'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, toApiError, ApiError } from '@/lib/api';
import { useUser } from '@/components/public/UserProvider';

export function NewTopicForm({ boardSlug }: { boardSlug: string }) {
  const { user, loading } = useUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [bodyMd, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  if (loading) return null;

  if (!user) {
    return (
      <div className="alert alert-error" style={{ margin: '10px 0' }}>
        NOTE: To start a topic, please <Link href="/register">Register</Link> or{' '}
        <Link href="/login">Login</Link>.
      </div>
    );
  }

  async function submit() {
    if (title.trim().length < 5 || !bodyMd.trim()) {
      setError(
        toApiError(
          new Error('Give your topic a title (min 5 characters) and an opening post.'),
          'POST',
          `/api/forum/board/${boardSlug}/topics`
        )
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ topic: { id: string } }>(`/api/forum/board/${boardSlug}/topics`, {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), bodyMd: bodyMd.trim() })
      });
      router.push(`/forum/topic/${res.topic.id}`);
      router.refresh();
    } catch (err) {
      setError(toApiError(err, 'POST', `/api/forum/board/${boardSlug}/topics`));
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div style={{ margin: '10px 0' }}>
        <button className="btn btn-solid" onClick={() => setOpen(true)}>
          + New Forum Topic
        </button>
      </div>
    );
  }

  return (
    <div className="card-flat" style={{ margin: '10px 0' }}>
      <label className="label" htmlFor="new-topic-title">
        Topic title
      </label>
      <input
        id="new-topic-title"
        className="input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={150}
        placeholder="What is this about?"
        style={{ marginBottom: 8 }}
      />
      <label className="label" htmlFor="new-topic-body">
        Opening post (markdown ok)
      </label>
      <textarea
        id="new-topic-body"
        className="textarea"
        rows={5}
        value={bodyMd}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Say hello, ask something, share something…"
      />
      {error ? (
        <div className="alert alert-error" style={{ marginTop: 6 }}>
          {error.summary}
        </div>
      ) : null}
      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        <button className="btn btn-solid" disabled={busy} onClick={submit}>
          {busy ? 'Posting…' : 'Post Topic'}
        </button>
        <button className="btn" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
