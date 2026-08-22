'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { mdToHtml } from '@/lib/sanitize';
import { TopicsResponse } from '@/lib/types';
import { useUser } from '@/components/public/UserProvider';

export default function AskPage() {
  const router = useRouter();
  const { user } = useUser();
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [body, setBody] = useState('');
  const [preview, setPreview] = useState(false);
  const [topics, setTopics] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<TopicsResponse>('/api/qa/topics')
      .then((res) => setTopics(res.topics.map((t) => t.topic)))
      .catch(() => {});
  }, []);

  const mdHtml = useMemo(() => mdToHtml(body), [body]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (title.trim().length < 5) {
      setError('Please write a question of at least 5 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ question: { slug: string } }>('/api/qa', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), bodyMd: body, topic: topic.trim() || undefined })
      });
      router.push(`/qa/${res.question.slug}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to ask question');
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <div className="card-flat" style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center', padding: '28px 16px' }}>
        <h1 style={{ fontSize: 20 }}>Ask a question</h1>
        <p className="muted" style={{ maxWidth: 400, margin: '8px auto' }}>
          Questions are public, permanent, and help other queer people find answers on Google. You
          need an account to ask.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 12 }}>
          <Link href="/register" className="btn btn-solid">
            Join free
          </Link>
          <Link href="/login" className="btn">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: 640, margin: '0 auto' }}>
      <div className="band" style={{ margin: '-8px -12px 14px' }}>
        Ask a question
      </div>
      <p className="muted" style={{ marginTop: 0, fontSize: 12 }}>
        Be specific and kind. Your question will appear publicly and can be answered by the community.
      </p>

      <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
        {error ? <div className="alert alert-error">{error}</div> : null}

        <div>
          <label className="label" htmlFor="q-title">
            Question
          </label>
          <textarea id="q-title" value={title} onChange={(e) => setTitle(e.target.value)} rows={2} placeholder="How do I …?" className="textarea" />
        </div>

        <div>
          <label className="label" htmlFor="q-topic">
            Topic
          </label>
          <input
            id="q-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            list="qa-topics"
            placeholder="e.g. coming-out, health, relationships"
            className="input"
          />
          <datalist id="qa-topics">
            {topics.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="label" htmlFor="q-body">
              Details (optional)
            </label>
            <button type="button" className="btn" onClick={() => setPreview((p) => !p)}>
              {preview ? 'Edit' : 'Preview'}
            </button>
          </div>
          {preview ? (
            <div
              className="md-preview card-flat"
              style={{ minHeight: 100 }}
              dangerouslySetInnerHTML={{ __html: mdHtml }}
            />
          ) : (
            <textarea id="q-body" value={body} onChange={(e) => setBody(e.target.value)} rows={6} placeholder="Add context — what you've tried, what you need (Markdown supported)." className="textarea" />
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" disabled={busy} className="btn btn-solid">
            {busy ? 'Posting…' : 'Ask question'}
          </button>
        </div>
      </form>
    </div>
  );
}
