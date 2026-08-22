// SEO helpers — site constants + JSON-LD builders.

export const SITE = {
  name: 'Umbrella.lgbt',
  url: 'https://umbrella.lgbt',
  tagline: 'The everything queer app',
  subtagline: 'Community. Meet. Q&A.',
  contact: 'hello@umbrella.lgbt',
  socials: { x: 'https://x.com/cocortech' }
};

export function absUrl(path: string): string {
  return `${SITE.url}${path.startsWith('/') ? path : `/${path}`}`;
}

export function person(name: string | null | undefined) {
  return { '@type': 'Person', name: name || 'Anonymous' };
}

export function organizationJson() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.name,
    url: SITE.url,
    description: `${SITE.tagline}. ${SITE.subtagline}. A platform built by and for the LGBTQ+ community.`,
    email: SITE.contact,
    sameAs: [SITE.socials.x]
  };
}

export function websiteJson() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
    description: `${SITE.tagline}. ${SITE.subtagline}.`,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE.url}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  };
}

export function webpageJson(title: string, url: string, description?: string | null) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    url,
    description: description || `${title}. A resource from ${SITE.name}.`,
    isPartOf: { '@type': 'WebSite', name: SITE.name, url: SITE.url }
  };
}

export function breadcrumbJson(parts: { name: string; url?: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: parts.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: p.name,
      ...(p.url ? { item: p.url } : {})
    }))
  };
}

export function articleJson(page: {
  title: string;
  url: string;
  author?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  description?: string | null;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: page.title,
    url: page.url,
    description: page.description || `${page.title}. A resource from ${SITE.name}.`,
    datePublished: page.publishedAt || page.updatedAt || undefined,
    dateModified: page.updatedAt || page.publishedAt || undefined,
    author: person(page.author),
    publisher: { '@type': 'Organization', name: SITE.name, url: SITE.url }
  };
}

export function definedTermJson(title: string, url: string, text: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: title,
    url,
    description: text
  };
}

export function faqJson(title: string, text: string, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: title,
        url,
        acceptedAnswer: { '@type': 'Answer', text }
      }
    ]
  };
}
