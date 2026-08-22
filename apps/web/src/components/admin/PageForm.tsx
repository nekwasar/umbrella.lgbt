'use client';

import { FormEvent, useMemo, useState } from 'react';
import { marked } from 'marked';
import { Page, PageMeta, PageStatus, PageType } from '@/lib/types';
import { Banner, Button, Checkbox, Field, Input, Select, Textarea } from '@/components/admin/ui';

const TYPES: PageType[] = ['BLOG', 'CORE', 'QA', 'GLOSSARY', 'CITY', 'RESOURCES'];

export interface PagePayload {
  type: PageType;
  slug: string;
  title: string;
  contentMd: string;
  status: PageStatus;
  seeded: boolean;
  topic: string | null;
  category: string | null;
  date: string | null;
  author: string | null;
  meta: Record<string, unknown>;
}

interface FormState {
  type: PageType;
  slug: string;
  title: string;
  contentMd: string;
  status: PageStatus;
  seeded: boolean;
  topic: string;
  category: string;
  date: string;
  author: string;
  meta: MetaState;
}

interface MetaState {
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  canonicalUrl: string;
  robots: string;
  noindex: boolean;
  nofollow: boolean;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogUrl: string;
  ogType: string;
  ogSiteName: string;
  ogLocale: string;
  twitterCard: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  twitterSite: string;
  twitterCreator: string;
  jsonldType: string;
  jsonldExtra: string;
  geoRegion: string;
  geoPlacename: string;
  geoPosition: string;
  icbm: string;
  hreflang: string;
  alternateUrls: string;
  authorName: string;
  publishedTime: string;
  modifiedTime: string;
  imageAlt: string;
}

function metaFromPageMeta(meta: PageMeta | null): MetaState {
  return {
    metaTitle: meta?.metaTitle ?? '',
    metaDescription: meta?.metaDescription ?? '',
    keywords: (meta?.keywords ?? []).join(', '),
    canonicalUrl: meta?.canonicalUrl ?? '',
    robots: meta?.robots ?? '',
    noindex: meta?.noindex ?? false,
    nofollow: meta?.nofollow ?? false,
    ogTitle: meta?.ogTitle ?? '',
    ogDescription: meta?.ogDescription ?? '',
    ogImage: meta?.ogImage ?? '',
    ogUrl: meta?.ogUrl ?? '',
    ogType: meta?.ogType ?? '',
    ogSiteName: meta?.ogSiteName ?? '',
    ogLocale: meta?.ogLocale ?? '',
    twitterCard: meta?.twitterCard ?? '',
    twitterTitle: meta?.twitterTitle ?? '',
    twitterDescription: meta?.twitterDescription ?? '',
    twitterImage: meta?.twitterImage ?? '',
    twitterSite: meta?.twitterSite ?? '',
    twitterCreator: meta?.twitterCreator ?? '',
    jsonldType: meta?.jsonldType ?? '',
    jsonldExtra: meta?.jsonldExtra ? JSON.stringify(meta.jsonldExtra, null, 2) : '',
    geoRegion: meta?.geoRegion ?? '',
    geoPlacename: meta?.geoPlacename ?? '',
    geoPosition: meta?.geoPosition ?? '',
    icbm: meta?.icbm ?? '',
    hreflang: (meta?.hreflang ?? []).join(', '),
    alternateUrls: (meta?.alternateUrls ?? []).join(', '),
    authorName: meta?.authorName ?? '',
    publishedTime: meta?.publishedTime ? meta.publishedTime.slice(0, 10) : '',
    modifiedTime: meta?.modifiedTime ? meta.modifiedTime.slice(0, 10) : '',
    imageAlt: meta?.imageAlt ?? ''
  };
}

const EMPTY_META: MetaState = {
  metaTitle: '',
  metaDescription: '',
  keywords: '',
  canonicalUrl: '',
  robots: '',
  noindex: false,
  nofollow: false,
  ogTitle: '',
  ogDescription: '',
  ogImage: '',
  ogUrl: '',
  ogType: '',
  ogSiteName: '',
  ogLocale: '',
  twitterCard: '',
  twitterTitle: '',
  twitterDescription: '',
  twitterImage: '',
  twitterSite: '',
  twitterCreator: '',
  jsonldType: '',
  jsonldExtra: '',
  geoRegion: '',
  geoPlacename: '',
  geoPosition: '',
  icbm: '',
  hreflang: '',
  alternateUrls: '',
  authorName: '',
  publishedTime: '',
  modifiedTime: '',
  imageAlt: ''
};

function formFromPage(page: Page): FormState {
  return {
    type: page.type,
    slug: page.slug,
    title: page.title,
    contentMd: page.contentMd ?? '',
    status: page.status,
    seeded: page.seeded,
    topic: page.topic ?? '',
    category: page.category ?? '',
    date: page.date ? page.date.slice(0, 10) : '',
    author: page.author ?? '',
    meta: metaFromPageMeta(page.meta)
  };
}

const EMPTY_FORM: FormState = {
  type: 'BLOG',
  slug: '',
  title: '',
  contentMd: '',
  status: 'PUBLISHED',
  seeded: true,
  topic: '',
  category: '',
  date: '',
  author: '',
  meta: { ...EMPTY_META }
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 150);
}

function splitList(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildPayload(form: FormState): PagePayload {
  const m = form.meta;
  const jsonldExtra = m.jsonldExtra.trim() ? JSON.parse(m.jsonldExtra) : null;
  return {
    type: form.type,
    slug: form.slug || slugify(form.title),
    title: form.title,
    contentMd: form.contentMd,
    status: form.status,
    seeded: form.seeded,
    topic: form.topic || null,
    category: form.category || null,
    date: form.date ? new Date(form.date).toISOString() : null,
    author: form.author || null,
    meta: {
      metaTitle: m.metaTitle || null,
      metaDescription: m.metaDescription || null,
      keywords: splitList(m.keywords),
      canonicalUrl: m.canonicalUrl || null,
      robots: m.robots || null,
      noindex: m.noindex,
      nofollow: m.nofollow,
      ogTitle: m.ogTitle || null,
      ogDescription: m.ogDescription || null,
      ogImage: m.ogImage || null,
      ogUrl: m.ogUrl || null,
      ogType: m.ogType || null,
      ogSiteName: m.ogSiteName || null,
      ogLocale: m.ogLocale || null,
      twitterCard: m.twitterCard || null,
      twitterTitle: m.twitterTitle || null,
      twitterDescription: m.twitterDescription || null,
      twitterImage: m.twitterImage || null,
      twitterSite: m.twitterSite || null,
      twitterCreator: m.twitterCreator || null,
      jsonldType: m.jsonldType || null,
      jsonldExtra,
      geoRegion: m.geoRegion || null,
      geoPlacename: m.geoPlacename || null,
      geoPosition: m.geoPosition || null,
      icbm: m.icbm || null,
      hreflang: splitList(m.hreflang),
      alternateUrls: splitList(m.alternateUrls),
      authorName: m.authorName || null,
      publishedTime: m.publishedTime ? new Date(m.publishedTime).toISOString() : null,
      modifiedTime: m.modifiedTime ? new Date(m.modifiedTime).toISOString() : null,
      imageAlt: m.imageAlt || null
    }
  };
}

export function PageForm({
  initial,
  mode,
  onSubmit,
  onCancel
}: {
  initial: Page | null;
  mode: 'create' | 'edit';
  onSubmit: (payload: PagePayload) => Promise<void>;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<FormState>(initial ? formFromPage(initial) : EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setMeta = (key: keyof MetaState, value: MetaState[keyof MetaState]) =>
    setForm((f) => ({ ...f, meta: { ...f.meta, [key]: value } }));

  const mdHtml = useMemo(() => {
    try {
      return marked.parse(form.contentMd || '') as string;
    } catch {
      return 'Invalid markdown';
    }
  }, [form.contentMd]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    let payload: PagePayload;
    try {
      payload = buildPayload(form);
    } catch (err) {
      setError('JSON-LD extra is not valid JSON.');
      return;
    }
    if (!payload.title.trim()) {
      setError('Title is required.');
      return;
    }
    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? <Banner kind="error">{error}</Banner> : null}

      {/* ===== Content ===== */}
      <section className="rounded-card border border-line bg-surface p-5 shadow-card">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">Content</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type" className="sm:col-span-1">
            <Select value={form.type} onChange={(e) => set('type', e.target.value as PageType)}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => set('status', e.target.value as PageStatus)}>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
            </Select>
          </Field>
          <Field label="Title" className="sm:col-span-2">
            <Input value={form.title} onChange={(e) => set('title', e.target.value)} required />
          </Field>
          <Field label="Slug" hint="Used in the URL. Auto-suggested from the title." className="sm:col-span-2">
            <div className="flex gap-2">
              <Input
                value={form.slug}
                onChange={(e) => set('slug', e.target.value)}
                placeholder="how-to-come-out"
                className="font-mono"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => set('slug', slugify(form.title))}
                className="shrink-0"
              >
                Auto
              </Button>
            </div>
          </Field>
          <Field label="Topic">
            <Input value={form.topic} onChange={(e) => set('topic', e.target.value)} placeholder="gender-identity" />
          </Field>
          <Field label="Category">
            <Input value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="health" />
          </Field>
          <Field label="Date">
            <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
          </Field>
          <Field label="Author">
            <Input value={form.author} onChange={(e) => set('author', e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Checkbox
              label="Seeded (included in sitemap / indexable)"
              checked={form.seeded}
              onChange={(v) => set('seeded', v)}
            />
          </div>
          <div className="sm:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">Content (Markdown)</span>
              <button
                type="button"
                onClick={() => setPreview((p) => !p)}
                className="rounded-md px-2 py-1 text-xs font-semibold text-brand hover:bg-brand-soft"
              >
                {preview ? 'Edit' : 'Preview'}
              </button>
            </div>
            {preview ? (
              <div className="md-preview min-h-[200px] rounded-lg border border-line-strong bg-canvas px-4 py-3">
                {form.contentMd ? (
                  <div dangerouslySetInnerHTML={{ __html: mdHtml }} />
                ) : (
                  <p className="text-faint">Nothing to preview yet.</p>
                )}
              </div>
            ) : (
              <Textarea
                value={form.contentMd}
                onChange={(e) => set('contentMd', e.target.value)}
                rows={14}
                placeholder="Write the page content in Markdown…"
                className="font-mono text-[13px]"
              />
            )}
          </div>
        </div>
      </section>

      {/* ===== Meta ===== */}
      <MetaSection meta={form.meta} setMeta={setMeta} />

      <div className="flex items-center justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit">{mode === 'create' ? 'Create page' : 'Save changes'}</Button>
      </div>
    </form>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-canvas/50 p-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-faint">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function MetaSection({
  meta,
  setMeta
}: {
  meta: MetaState;
  setMeta: (key: keyof MetaState, value: MetaState[keyof MetaState]) => void;
}) {
  const str = (key: keyof MetaState) => ({
    value: meta[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setMeta(key, e.target.value)
  });

  return (
    <section className="rounded-card border border-line bg-surface p-5 shadow-card">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">SEO &amp; Meta</h2>
      <div className="space-y-4">
        <Group title="Search basics">
          <Field label="Meta title" className="sm:col-span-2">
            <Input {...str('metaTitle')} placeholder="The Umbrella Manifesto | Umbrella.lgbt" maxLength={200} />
          </Field>
          <Field label="Meta description" className="sm:col-span-2">
            <Textarea {...str('metaDescription')} rows={2} maxLength={500} placeholder="A compelling, ~155 char description." />
          </Field>
          <Field label="Keywords" className="sm:col-span-2">
            <Input {...str('keywords')} placeholder="queer, community, coming out (comma separated)" />
          </Field>
          <Field label="Canonical URL" className="sm:col-span-2">
            <Input {...str('canonicalUrl')} placeholder="https://umbrella.lgbt/blog/coming-out-guide" />
          </Field>
          <Field label="Robots">
            <Input {...str('robots')} placeholder="index, follow" />
          </Field>
          <div className="flex items-end gap-6 pb-1">
            <Checkbox label="Noindex" checked={meta.noindex} onChange={(v) => setMeta('noindex', v)} />
            <Checkbox label="Nofollow" checked={meta.nofollow} onChange={(v) => setMeta('nofollow', v)} />
          </div>
        </Group>

        <Group title="Open Graph">
          <Field label="og:title">
            <Input {...str('ogTitle')} />
          </Field>
          <Field label="og:type">
            <Input {...str('ogType')} placeholder="article / website" />
          </Field>
          <Field label="og:description" className="sm:col-span-2">
            <Textarea {...str('ogDescription')} rows={2} />
          </Field>
          <Field label="og:image" className="sm:col-span-2">
            <Input {...str('ogImage')} placeholder="https://umbrella.lgbt/assets/og-image.svg" />
          </Field>
          <Field label="og:url">
            <Input {...str('ogUrl')} />
          </Field>
          <Field label="og:site_name">
            <Input {...str('ogSiteName')} placeholder="Umbrella.lgbt" />
          </Field>
          <Field label="og:locale">
            <Input {...str('ogLocale')} placeholder="en_US" />
          </Field>
        </Group>

        <Group title="Twitter card">
          <Field label="twitter:card">
            <Input {...str('twitterCard')} placeholder="summary_large_image" />
          </Field>
          <Field label="twitter:site">
            <Input {...str('twitterSite')} placeholder="@cocortech" />
          </Field>
          <Field label="twitter:title">
            <Input {...str('twitterTitle')} />
          </Field>
          <Field label="twitter:creator">
            <Input {...str('twitterCreator')} />
          </Field>
          <Field label="twitter:description" className="sm:col-span-2">
            <Textarea {...str('twitterDescription')} rows={2} />
          </Field>
          <Field label="twitter:image" className="sm:col-span-2">
            <Input {...str('twitterImage')} />
          </Field>
        </Group>

        <Group title="Structured data">
          <Field label="JSON-LD type">
            <Input {...str('jsonldType')} placeholder="Article / FAQPage / QAPage" />
          </Field>
          <Field label="Image alt">
            <Input {...str('imageAlt')} />
          </Field>
          <Field label="JSON-LD extra (JSON)" className="sm:col-span-2">
            <Textarea {...str('jsonldExtra')} rows={5} className="font-mono text-[13px]" placeholder={'{\n  "customField": "value"\n}'} />
          </Field>
        </Group>

        <Group title="Geo (city / local pages)">
          <Field label="geo.region">
            <Input {...str('geoRegion')} placeholder="DE-BE" />
          </Field>
          <Field label="geo.placename">
            <Input {...str('geoPlacename')} placeholder="Berlin" />
          </Field>
          <Field label="geo.position">
            <Input {...str('geoPosition')} placeholder="52.5200;13.4050" />
          </Field>
          <Field label="ICBM">
            <Input {...str('icbm')} placeholder="52.5200, 13.4050" />
          </Field>
        </Group>

        <Group title="Alternates &amp; attribution">
          <Field label="Hreflang" className="sm:col-span-2">
            <Input {...str('hreflang')} placeholder="en, en-gb (comma separated)" />
          </Field>
          <Field label="Alternate URLs" className="sm:col-span-2">
            <Textarea {...str('alternateUrls')} rows={2} placeholder="One URL per line" />
          </Field>
          <Field label="Author name">
            <Input {...str('authorName')} />
          </Field>
          <Field label="Image alt">
            <Input {...str('imageAlt')} />
          </Field>
          <Field label="Published time">
            <Input type="date" value={meta.publishedTime} onChange={(e) => setMeta('publishedTime', e.target.value)} />
          </Field>
          <Field label="Modified time">
            <Input type="date" value={meta.modifiedTime} onChange={(e) => setMeta('modifiedTime', e.target.value)} />
          </Field>
        </Group>
      </div>
    </section>
  );
}
