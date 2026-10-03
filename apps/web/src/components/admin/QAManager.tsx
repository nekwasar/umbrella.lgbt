'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, toApiError, ApiError } from '@/lib/api';
import type { AdminQuestion, QuestionLogEntry, SearchGapEntry } from '@/lib/types';
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
  Spinner,
  Textarea
} from '@/components/admin/ui';
import { timeAgo } from '@/lib/time';

type Tab = 'questions' | 'logs' | 'searches';

const emptyFilters = { q: '', topic: '', status: '' };
const emptyForm = { title: '', topic: '', bodyMd: '', status: 'PUBLISHED' };

const ACTION_TONES: Record<string, 'neutral' | 'good' | 'warn' | 'brand'> = {
  created: 'good',
  edited: 'brand',
  removed: 'warn',
  restored: 'neutral'
};

export function QAManager() {
  const [tab, setTab] = useState<Tab>('questions');

  // questions state
  const [items, setItems] = useState<AdminQuestion[]>([]);
  const [topics, setTopics] = useState<Array<{ topic: string; count: number }>>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  // edit form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<ApiError | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // logs state
  const [logs, setLogs] = useState<QuestionLogEntry[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<ApiError | null>(null);

  // search-gap state
  const [gaps, setGaps] = useState<SearchGapEntry[]>([]);
  const [gapsTotal, setGapsTotal] = useState(0);
  const [gapsLoading, setGapsLoading] = useState(false);
  const [gapsError, setGapsError] = useState<ApiError | null>(null);
  const [onlyZeros, setOnlyZeros] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const params = new URLSearchParams({ pageSize: '100' });
      if (filters.q) params.set('q', filters.q);
      if (filters.topic) params.set('topic', filters.topic);
      if (filters.status) params.set('status', filters.status);
      const res = await api<{ total: number; items: AdminQuestion[]; topics: Array<{ topic: string; count: number }> }>(
        `/api/admin/qa/questions?${params.toString()}`
      );
      setItems(res.items);
      setTotal(res.total);
      setTopics(res.topics);
      setError(null);
    } catch (err) {
      setError(toApiError(err, 'GET', '/api/admin/qa/questions'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const refreshLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await api<{ total: number; items: QuestionLogEntry[] }>('/api/admin/qa/logs?pageSize=100');
      setLogs(res.items);
      setLogsTotal(res.total);
      setLogsError(null);
    } catch (err) {
      setLogsError(toApiError(err, 'GET', '/api/admin/qa/logs'));
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const refreshGaps = useCallback(async () => {
    setGapsLoading(true);
    try {
      const res = await api<{ total: number; items: SearchGapEntry[] }>(
        `/api/admin/qa/searches?pageSize=500${onlyZeros ? '&onlyZeros=1' : ''}`
      );
      setGaps(res.items);
      setGapsTotal(res.total);
      setGapsError(null);
    } catch (err) {
      setGapsError(toApiError(err, 'GET', '/api/admin/qa/searches'));
    } finally {
      setGapsLoading(false);
    }
  }, [onlyZeros]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (tab === 'logs' && logs.length === 0 && !logsError) {
      refreshLogs();
    }
  }, [tab, logs.length, logsError, refreshLogs]);

  useEffect(() => {
    if (tab === 'searches') {
      refreshGaps();
    }
  }, [tab, refreshGaps]);

  function downloadCsv() {
    const header = 'query,hits,zero_result_searches,last_results,first_searched,last_searched';
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = gaps.map((g) =>
      [esc(g.query), g.hits, g.zeros, g.lastResults, g.firstSearchedAt, g.lastSearchedAt].join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `umbrella-search-gaps-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function applyFilters(e: FormEvent) {
    e.preventDefault();
    setFilters((f) => ({ ...f, q: (f.q || '').trim() }));
  }

  function startEdit(q: AdminQuestion) {
    setEditingId(q.id);
    setForm({ title: q.title, topic: q.topic ?? '', bodyMd: q.bodyMd, status: q.status });
    setFormError(null);
    setSaved(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setSaved(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setBusy(true);
    setFormError(null);
    setSaved(null);
    try {
      const res = await api<{ changed: boolean; action?: string }>(
        `/api/admin/qa/questions/${editingId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            title: form.title,
            topic: form.topic.trim() ? form.topic.trim() : null,
            bodyMd: form.bodyMd,
            status: form.status
          })
        }
      );
      setSaved(res.changed ? `Saved and logged (${res.action ?? 'edited'})` : 'No changes to save');
      if (res.changed) {
        await refresh();
        refreshLogs();
      }
    } catch (err) {
      setFormError(toApiError(err, 'PATCH', `/api/admin/qa/questions/${editingId}`));
    } finally {
      setBusy(false);
    }
  }

  async function remove(q: AdminQuestion) {
    if (!window.confirm(`Remove "${q.title}"? It will be hidden (status REMOVED) and logged.`)) return;
    try {
      await api(`/api/admin/qa/questions/${q.id}`, { method: 'DELETE' });
      await refresh();
      refreshLogs();
    } catch (err) {
      setError(toApiError(err, 'DELETE', `/api/admin/qa/questions/${q.id}`));
    }
  }

  return (
    <div>
      <PageHeader
        title="Q&A"
        subtitle="Community questions and answers. Edit content here — every change is written to the question log."
      />

      <div className="mb-4 flex gap-2">
        <Button
          variant={tab === 'questions' ? 'primary' : 'secondary'}
          onClick={() => setTab('questions')}
        >
          Questions ({total})
        </Button>
        <Button variant={tab === 'logs' ? 'primary' : 'secondary'} onClick={() => setTab('logs')}>
          Log ({logsTotal})
        </Button>
        <Button variant={tab === 'searches' ? 'primary' : 'secondary'} onClick={() => setTab('searches')}>
          Searches ({gapsTotal})
        </Button>
      </div>

      {tab === 'questions' ? (
        <>
          {editingId ? (
            <Card className="mb-6 p-4">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
                Edit question
              </h2>
              <form onSubmit={submit} className="grid gap-3" style={{ maxWidth: 720 }}>
                <Field label="Title" hint="The URL (slug) only changes if it still matches the old title">
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                    minLength={5}
                    maxLength={300}
                  />
                </Field>
                <div className="flex flex-wrap gap-4">
                  <Field label="Topic">
                    <Input
                      value={form.topic}
                      onChange={(e) => setForm({ ...form, topic: e.target.value })}
                      maxLength={60}
                      placeholder="coming-out"
                      style={{ width: 200 }}
                    />
                  </Field>
                  <Field label="Status">
                    <Select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      style={{ width: 160 }}
                    >
                      <option value="PUBLISHED">Published</option>
                      <option value="PENDING">Pending</option>
                      <option value="REMOVED">Removed</option>
                    </Select>
                  </Field>
                </div>
                <Field label="Body (markdown ok)">
                  <Textarea
                    value={form.bodyMd}
                    onChange={(e) => setForm({ ...form, bodyMd: e.target.value })}
                    rows={10}
                    maxLength={100_000}
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
                {saved ? <Banner kind="success">{saved}</Banner> : null}
                <div className="flex gap-2">
                  <Button type="submit" loading={busy}>
                    Save changes
                  </Button>
                  <Button type="button" variant="secondary" onClick={cancelEdit}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          ) : null}

          <Card className="mb-4 p-4">
            <form onSubmit={applyFilters} className="flex flex-wrap items-end gap-3">
              <Field label="Search">
                <Input
                  value={filters.q}
                  onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                  placeholder="title, slug, or topic"
                  style={{ width: 240 }}
                />
              </Field>
              <Field label="Topic">
                <Select
                  value={filters.topic}
                  onChange={(e) => setFilters({ ...filters, topic: e.target.value })}
                  style={{ width: 180 }}
                >
                  <option value="">All topics</option>
                  {topics.map((t) => (
                    <option key={t.topic} value={t.topic}>
                      {t.topic} ({t.count})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Status">
                <Select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  style={{ width: 150 }}
                >
                  <option value="">All</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="PENDING">Pending</option>
                  <option value="REMOVED">Removed</option>
                </Select>
              </Field>
              <Button type="submit" variant="secondary">
                Filter
              </Button>
            </form>
          </Card>

          {error ? (
            <Banner kind="error" className="mb-4">
              {error.summary}
            </Banner>
          ) : null}

          {loading ? (
            <p className="muted flex items-center gap-2">
              <Spinner /> Loading questions…
            </p>
          ) : items.length === 0 ? (
            <EmptyState>No questions match. Clear the filters or run npm run seed:qa.</EmptyState>
          ) : (
            <Card className="p-0">
              {items.map((q) => (
                <div
                  key={q.id}
                  className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{q.title}</p>
                    <p className="truncate text-xs text-faint">
                      /qa/{q.slug} · {q.author}
                      {q.topic ? ` · ${q.topic}` : ''} · {q.answerCount} answers · {q.viewCount}{' '}
                      views · {q.logCount} log {q.logCount === 1 ? 'entry' : 'entries'} · updated{' '}
                      {timeAgo(q.updatedAt)}
                    </p>
                  </div>
                  {q.topic ? <Badge tone="brand">{q.topic}</Badge> : null}
                  <Badge tone={q.status === 'PUBLISHED' ? 'good' : q.status === 'PENDING' ? 'warn' : 'warn'}>
                    {q.status === 'PUBLISHED' ? 'Published' : q.status === 'PENDING' ? 'Pending' : 'Removed'}
                  </Badge>
                  <Button variant="secondary" onClick={() => startEdit(q)}>
                    Edit
                  </Button>
                  {q.status !== 'REMOVED' ? (
                    <Button variant="danger" onClick={() => remove(q)}>
                      Remove
                    </Button>
                  ) : null}
                </div>
              ))}
            </Card>
          )}
        </>
      ) : tab === 'searches' ? (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted">
              What people searched for — <strong>{gapsTotal}</strong>{' '}
              {onlyZeros ? 'searches that found nothing' : 'searches'} (last 500 shown).
            </p>
            <Checkbox
              label="Only searches that found nothing"
              checked={onlyZeros}
              onChange={(v) => setOnlyZeros(v)}
            />
            <Button variant="secondary" onClick={refreshGaps} loading={gapsLoading}>
              Refresh
            </Button>
            {gaps.length > 0 ? (
              <Button variant="secondary" onClick={downloadCsv}>
                Download CSV
              </Button>
            ) : null}
          </div>

          {gapsError ? (
            <Banner kind="error" className="mb-4">
              {gapsError.summary}
            </Banner>
          ) : null}

          {gapsLoading && gaps.length === 0 ? (
            <p className="muted flex items-center gap-2">
              <Spinner /> Loading searches…
            </p>
          ) : gaps.length === 0 ? (
            <EmptyState>
              No searches recorded yet. They appear automatically as people search the Q&amp;A.
            </EmptyState>
          ) : (
            <Card className="p-0">
              {gaps.map((g) => (
                <div
                  key={g.id}
                  className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{g.query}</p>
                    <p className="text-xs text-faint">
                      searched {g.hits}× · {g.zeros}× with no results · last returned {g.lastResults} · last
                      searched {timeAgo(g.lastSearchedAt)}
                    </p>
                  </div>
                  {g.zeros > 0 ? <Badge tone="warn">unanswered</Badge> : <Badge tone="good">answered</Badge>}
                </div>
              ))}
            </Card>
          )}
        </>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-3">
            <p className="text-sm text-muted">
              Newest first — {logsTotal} {logsTotal === 1 ? 'entry' : 'entries'} (last 100 shown).
            </p>
            <Button variant="secondary" onClick={refreshLogs} loading={logsLoading}>
              Refresh
            </Button>
          </div>

          {logsError ? (
            <Banner kind="error" className="mb-4">
              {logsError.summary}
            </Banner>
          ) : null}

          {logsLoading && logs.length === 0 ? (
            <p className="muted flex items-center gap-2">
              <Spinner /> Loading log…
            </p>
          ) : logs.length === 0 ? (
            <EmptyState>No log entries yet — create or edit a question to start the trail.</EmptyState>
          ) : (
            <Card className="p-0">
              {logs.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-0"
                >
                  <Badge tone={ACTION_TONES[entry.action] ?? 'neutral'}>{entry.action}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{entry.questionTitle}</p>
                    <p className="truncate text-xs text-faint">
                      {entry.detail ?? '—'} · by{' '}
                      {entry.actorName ? `${entry.actorName} (${entry.actorKind ?? 'user'})` : 'system'} ·{' '}
                      {timeAgo(entry.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
