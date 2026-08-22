import type { Metadata } from 'next';
import { mdToText } from './sanitize';
import { Page } from './types';
import { SITE } from './seo';

export function pageMetadata(p: Page, opts: { ogType?: 'website' | 'article' } = {}): Metadata {
  const m = p.meta;
  const canonical = m?.canonicalUrl || `${SITE.url}${p.url}`;
  const title = m?.metaTitle || `${p.title} | ${SITE.name}`;
  const description =
    m?.metaDescription || mdToText(p.contentMd, 155) || `${p.title} — ${SITE.name}.`;
  const image = m?.ogImage || '/assets/og-image.svg';

  return {
    title,
    description,
    keywords: m?.keywords?.length ? m.keywords : undefined,
    alternates: { canonical },
    robots:
      m?.robots ||
      ({
        index: m?.noindex ? false : true,
        follow: m?.nofollow ? false : true
      } as Metadata['robots']),
    openGraph: {
      title: m?.ogTitle || title,
      description: m?.ogDescription || description,
      url: m?.ogUrl || canonical,
      siteName: m?.ogSiteName || SITE.name,
      type: m?.ogType === 'article' ? 'article' : opts.ogType || 'website',
      locale: m?.ogLocale || 'en_US',
      images: [{ url: m?.ogImage || '/assets/og-image.svg', alt: m?.imageAlt || title }]
    },
    twitter: {
      card: (m?.twitterCard as 'summary' | 'summary_large_image' | 'app' | 'player') || 'summary_large_image',
      title: m?.twitterTitle || title,
      description: m?.twitterDescription || description,
      site: m?.twitterSite || undefined,
      creator: m?.twitterCreator || undefined,
      images: m?.twitterImage ? [m.twitterImage] : [image]
    }
  };
}
