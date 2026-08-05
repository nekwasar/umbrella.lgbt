# Umbrella.lgbt — URLs to Request Indexing

Generated from `sitemap.xml` (33 URLs, all `index, follow`).

## How to Use This List

1. Deploy the site to Vercel (see `m8-launch-checklist.md`).
2. Verify the domain in **Google Search Console**.
3. Submit `https://umbrella.lgbt/sitemap.xml` — Google auto-crawls it.
4. For faster indexing, paste these URLs in **URL Inspection → Request Indexing** (batch is fine; Google processes queue).
5. Repeat in **Bing Webmaster Tools** (paste same list in URL Submission).

## Priority 1 — Core (request first, 8 URLs)

```
https://umbrella.lgbt
https://umbrella.lgbt/about
https://umbrella.lgbt/features
https://umbrella.lgbt/waitlist
https://umbrella.lgbt/press
https://umbrella.lgbt/contact
https://umbrella.lgbt/privacy
https://umbrella.lgbt/blog/umbrella-manifesto
```

## Priority 2 — Q&A (high SEO value, 6 URLs)

```
https://umbrella.lgbt/qa
https://umbrella.lgbt/qa/what-is-gender-dysphoria
https://umbrella.lgbt/qa/how-to-come-out
https://umbrella.lgbt/qa/gay-dating-vs-community
https://umbrella.lgbt/qa/what-is-asexual
https://umbrella.lgbt/qa/what-is-hrt
```

## Priority 3 — Glossary (10 URLs)

```
https://umbrella.lgbt/glossary
https://umbrella.lgbt/glossary/lgbtq
https://umbrella.lgbt/glossary/queer
https://umbrella.lgbt/glossary/gay
https://umbrella.lgbt/glossary/lesbian
https://umbrella.lgbt/glossary/bisexual
https://umbrella.lgbt/glossary/transgender
https://umbrella.lgbt/glossary/non-binary
https://umbrella.lgbt/glossary/asexual
https://umbrella.lgbt/glossary/cisgender
https://umbrella.lgbt/glossary/pronouns
```

## Priority 4 — Cities & Resources (7 URLs)

```
https://umbrella.lgbt/city
https://umbrella.lgbt/city/berlin
https://umbrella.lgbt/city/new-york
https://umbrella.lgbt/resources
https://umbrella.lgbt/resources/us
https://umbrella.lgbt/resources/uk
https://umbrella.lgbt/blog
```

## Priority 5 — Blog (2 URLs)

```
https://umbrella.lgbt/blog/coming-out-guide
```

> Note: `https://umbrella.lgbt/blog` (index) is listed in Priority 4; the remaining blog URL is above.

---

**Regenerate after seeding more pages:** run `npm run build` and re-extract:

```bash
grep -oP '<loc>\K[^<]+' public/sitemap.xml
```
