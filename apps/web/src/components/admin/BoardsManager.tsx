'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, toApiError, ApiError } from '@/lib/api';
import type { ForumBoard } from '@/lib/types';
import {
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Textarea
} from '@/components/admin/ui';

const emptyForm = { category: '', name: '', slug: '', description: '', position: 0 };

export function BoardsManager() {
  const [boards, setBoards] = useState<ForumBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<ApiError | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await api<{ items: ForumBoard[] }>('/api/admin/boards');
      setBoards(res.items);
      setError(null);
    } catch (err) {
      setError(toApiError(err, 'GET', '/api/admin/boards'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function startEdit(b: ForumBoard) {
    setEditingId(b.id);
    setForm({
      category: b.category,
      name: b.name,
      slug: b.slug,
      description: b.description ?? '',
      position: 0
    });
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
        category: form.category,
        name: form.name,
        ...(form.slug.trim() ? { slug: form.slug.trim() } : {}),
        description: form.description,
        position: Number(form.position) || 0
      };
      if (editingId) {
        await api(`/api/admin/boards/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await api('/api/admin/boards', { method: 'POST', body: JSON.stringify(payload) });
      }
      cancelEdit();
      await refresh();
    } catch (err) {
      setFormError(toApiError(err, editingId ? 'PUT' : 'POST', '/api/admin/boards'));
    } finally {
      setBusy(false);
    }
  }

  async function remove(b: ForumBoard) {
    if (
      !window.confirm(
        `Delete board "${b.name}" and ALL its topics + posts (${b.topicCount} topics)? This cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await api(`/api/admin/boards/${b.id}`, { method: 'DELETE' });
      await refresh();
    } catch (err) {
      setError(toApiError(err, 'DELETE', `/api/admin/boards/${b.id}`));
    }
  }

  return (
    <div>
      <PageHeader
        title="Forum Boards"
        subtitle="Boards appear on /forum grouped by category. Deleting a board removes all its topics and posts."
      />

      <Card className="mb-6 p-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
          {editingId ? 'Edit board' : 'New board'}
        </h2>
        <form onSubmit={submit} className="grid gap-3" style={{ maxWidth: 560 }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category" hint="e.g. General Discussion">
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                required
                maxLength={60}
                placeholder="General Discussion"
              />
            </Field>
            <Field label="Position" hint="Sort order inside the category">
              <Input
                type="number"
                min={0}
                max={999}
                value={form.position}
                onChange={(e) => setForm({ ...form, position: Number(e.target.value) })}
              />
            </Field>
          </div>
          <Field label="Board name">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              maxLength={80}
              placeholder="Introductions"
            />
          </Field>
          <Field label="Slug (optional)" hint="Auto-generated from the name when empty">
            <Input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              maxLength={80}
              placeholder="introductions"
            />
          </Field>
          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              maxLength={500}
              rows={2}
              placeholder="What is this board for?"
            />
          </Field>
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
              {editingId ? 'Save changes' : 'Create board'}
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
        <p className="muted">Loading boards…</p>
      ) : boards.length === 0 ? (
        <EmptyState>No boards yet. Create the first one above.</EmptyState>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase text-muted">
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">Board</th>
                <th className="px-4 py-2">Slug</th>
                <th className="px-4 py-2">Topics</th>
                <th className="px-4 py-2">Posts</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {boards.map((b) => (
                <tr key={b.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2">
                    <Badge tone="brand">{b.category}</Badge>
                  </td>
                  <td className="px-4 py-2 font-semibold">{b.name}</td>
                  <td className="px-4 py-2 font-mono text-xs text-muted">{b.slug}</td>
                  <td className="px-4 py-2">{b.topicCount}</td>
                  <td className="px-4 py-2">{b.postCount}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => startEdit(b)}>
                        Edit
                      </Button>
                      <Button variant="danger" onClick={() => remove(b)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
