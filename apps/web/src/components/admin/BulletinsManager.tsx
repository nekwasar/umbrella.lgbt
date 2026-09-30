'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, toApiError, ApiError } from '@/lib/api';
import type { BulletinSummary } from '@/lib/types';
import {
  Badge,
  Banner,
  Button,
  Card,
  Checkbox,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea
} from '@/components/admin/ui';
import { timeAgo } from '@/lib/time';

const emptyForm = { title: '', bodyMd: '', pinned: false, status: 'PUBLISHED' };

export function BulletinsManager() {
  const [items, setItems] = useState<BulletinSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<ApiError | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await api<{ items: BulletinSummary[] }>('/api/admin/bulletins');
      setItems(res.items);
      setError(null);
    } catch (err) {
      setError(toApiError(err, 'GET', '/api/admin/bulletins'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function startEdit(b: BulletinSummary) {
    setEditingId(b.id);
    setForm({ title: b.title, bodyMd: b.bodyMd ?? '', pinned: b.pinned, status: b.status });
    setFormError(null);
    window.scrollTo({ top: 0 });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      const payload = {
        title: form.title,
        bodyMd: form.bodyMd,
        pinned: form.pinned,
        status: form.status as 'PUBLISHED' | 'REMOVED'
      };
      if (editingId) {
        await api(`/api/admin/bulletins/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await api('/api/admin/bulletins', { method: 'POST', body: JSON.stringify(payload) });
      }
      cancelEdit();
      await refresh();
    } catch (err) {
      setFormError(toApiError(err, editingId ? 'PUT' : 'POST', '/api/admin/bulletins'));
    } finally {
      setBusy(false);
    }
  }

  async function remove(b: BulletinSummary) {
    if (!window.confirm(`Delete bulletin "${b.title}" and all its comments? This cannot be undone.`)) {
      return;
    }
    try {
      await api(`/api/admin/bulletins/${b.id}`, { method: 'DELETE' });
      await refresh();
    } catch (err) {
      setError(toApiError(err, 'DELETE', `/api/admin/bulletins/${b.id}`));
    }
  }

  return (
    <div>
      <PageHeader
        title="Bulletins"
        subtitle="Site announcements, MySpace-style. Pinned bulletins lead the homepage panel and /bulletin."
      />

      <Card className="mb-6 p-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
          {editingId ? 'Edit bulletin' : 'New bulletin'}
        </h2>
        <form onSubmit={submit} className="grid gap-3" style={{ maxWidth: 640 }}>
          <Field label="Title">
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              minLength={3}
              maxLength={150}
              placeholder="Welcome to Umbrella"
            />
          </Field>
          <Field label="Body (markdown ok)" hint="Links, **bold**, line breaks all work">
            <Textarea
              value={form.bodyMd}
              onChange={(e) => setForm({ ...form, bodyMd: e.target.value })}
              rows={6}
              maxLength={50_000}
              placeholder="What is happening?"
            />
          </Field>
          <div className="flex items-center gap-6">
            <Checkbox
              label="Pinned (stays at top)"
              checked={form.pinned}
              onChange={(v) => setForm({ ...form, pinned: v })}
            />
            <Field label="Status">
              <Select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                style={{ width: 160 }}
              >
                <option value="PUBLISHED">Published</option>
                <option value="REMOVED">Hidden</option>
              </Select>
            </Field>
          </div>
          {formError ? (
            <Banner kind="error">
              <p className="font-semibold">{formError.summary}</p>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-[11px] opacity-80">
                {formError.detail}
              </pre>
            </Banner>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" loading={busy}>
              {editingId ? 'Save changes' : 'Post bulletin'}
            </Button>
            {editingId ? (
              <Button type="button" variant="secondary" onClick={cancelEdit}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      </Card>

      {error ? (
        <Banner kind="error" className="mb-4">
          {error.summary}
        </Banner>
      ) : null}

      {loading ? (
        <p className="muted">Loading bulletins…</p>
      ) : items.length === 0 ? (
        <EmptyState>No bulletins yet. Post the welcome one above.</EmptyState>
      ) : (
        <Card className="p-0">
          {items.map((b) => (
            <div
              key={b.id}
              className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-0"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {b.pinned ? '📌 ' : ''}
                  {b.title}
                </p>
                <p className="text-xs text-faint">
                  {timeAgo(b.createdAt)} · {b.commentCount ?? 0} comments
                </p>
              </div>
              <Badge tone={b.status === 'PUBLISHED' ? 'good' : 'warn'}>
                {b.status === 'PUBLISHED' ? 'Published' : 'Hidden'}
              </Badge>
              <Button variant="secondary" onClick={() => startEdit(b)}>
                Edit
              </Button>
              <Button variant="danger" onClick={() => remove(b)}>
                Delete
              </Button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
