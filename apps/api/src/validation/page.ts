import { z } from 'zod';

export const PAGE_TYPES = ['CORE', 'BLOG', 'QA', 'GLOSSARY', 'CITY', 'RESOURCES'] as const;
export type PageType = (typeof PAGE_TYPES)[number];

const typeEnum = z.preprocess(
  (v) => (typeof v === 'string' ? v.toUpperCase() : v),
  z.enum(PAGE_TYPES)
);

const optionalDate = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid date')
  .nullable()
  .optional();

export const pageMetaSchema = z
  .object({
    metaTitle: z.string().max(200).nullable().optional(),
    metaDescription: z.string().max(500).nullable().optional(),
    keywords: z.array(z.string().max(80)).max(100).optional(),
    canonicalUrl: z.string().url().nullable().optional(),
    robots: z.string().max(100).nullable().optional(),
    noindex: z.boolean().optional(),
    nofollow: z.boolean().optional(),
    ogTitle: z.string().max(200).nullable().optional(),
    ogDescription: z.string().max(500).nullable().optional(),
    ogImage: z.string().url().nullable().optional(),
    ogUrl: z.string().url().nullable().optional(),
    ogType: z.string().max(50).nullable().optional(),
    ogSiteName: z.string().max(100).nullable().optional(),
    ogLocale: z.string().max(20).nullable().optional(),
    twitterCard: z.string().max(50).nullable().optional(),
    twitterTitle: z.string().max(200).nullable().optional(),
    twitterDescription: z.string().max(500).nullable().optional(),
    twitterImage: z.string().url().nullable().optional(),
    twitterSite: z.string().max(100).nullable().optional(),
    twitterCreator: z.string().max(100).nullable().optional(),
    jsonldType: z.string().max(100).nullable().optional(),
    jsonldExtra: z.record(z.any()).nullable().optional(),
    geoRegion: z.string().max(50).nullable().optional(),
    geoPlacename: z.string().max(200).nullable().optional(),
    geoPosition: z.string().max(100).nullable().optional(),
    icbm: z.string().max(100).nullable().optional(),
    hreflang: z.array(z.string().max(200)).max(50).optional(),
    alternateUrls: z.array(z.string().max(500)).max(50).optional(),
    authorName: z.string().max(150).nullable().optional(),
    publishedTime: optionalDate,
    modifiedTime: optionalDate,
    imageAlt: z.string().max(300).nullable().optional()
  })
  .partial();

export const pageUpsertSchema = z.object({
  type: typeEnum,
  slug: z
    .string()
    .min(1)
    .max(150)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be lowercase, with hyphens only (e.g. how-to-come-out)'),
  title: z.string().min(1).max(300),
  contentMd: z.string().max(500_000).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  seeded: z.boolean().optional(),
  topic: z.string().max(100).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  date: optionalDate,
  author: z.string().max(150).nullable().optional(),
  meta: pageMetaSchema.optional()
});

export const bulkMetaSchema = z.object({
  items: z
    .array(z.object({ id: z.string().min(1), meta: pageMetaSchema }))
    .min(1)
    .max(500)
});
