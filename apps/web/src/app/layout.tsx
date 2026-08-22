import type { Metadata } from 'next';
import './globals.css';
import { SITE, organizationJson, websiteJson } from '@/lib/seo';

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — The everything queer app`,
    template: `%s | ${SITE.name}`
  },
  description: `${SITE.tagline}. ${SITE.subtagline}. A platform built by and for the LGBTQ+ community. Find queer community, answers, events, and resources — all under one umbrella.`,
  icons: {
    icon: '/assets/favicon.svg',
    apple: '/assets/apple-touch-icon.png'
  },
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    url: SITE.url,
    title: `${SITE.name} — The everything queer app`,
    description: `${SITE.tagline}. ${SITE.subtagline}. A platform built by and for the LGBTQ+ community.`,
    images: [{ url: '/assets/og-image.svg', width: 1200, height: 630, alt: SITE.name }]
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} — The everything queer app`,
    description: `${SITE.tagline}. ${SITE.subtagline}.`,
    images: ['/assets/og-image.svg']
  },
  robots: { index: true, follow: true }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJson()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJson()) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
