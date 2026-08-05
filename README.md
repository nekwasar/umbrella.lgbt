# Umbrella.lgbt — Pre-Launch Site

The everything queer app. This repository contains the pre-launch static site for [umbrella.lgbt](https://umbrella.lgbt) — built to grow domain authority before the full platform launches in 2026.

## Tech Stack

- **Build**: Node.js + `marked` (markdown → HTML)
- **Output**: Fully static HTML in `public/`
- **Hosting**: Vercel (free tier)
- **No framework**. No database. No backend.

## Project Structure

```
├── content.json          # Page registry: type, slug, title, seeded status
├── build.js              # Build script: content.json + content/*.md → public/
├── content/
│   ├── core/             # Core pages (about, features, waitlist, press, contact, privacy)
│   ├── qa/               # Q&A questions (50 planned)
│   ├── glossary/         # LGBTQ+ glossary terms (50 planned)
│   ├── city/             # Queer city guides (20 planned)
│   ├── resources/        # Country resource directories (10 planned)
│   └── blog/             # Blog posts (20 planned)
├── templates/            # HTML templates (base + one per content type)
├── public/               # Build output (generated — do not edit, do not commit)
└── vercel.json           # Vercel build config
```

## How It Works

1. Every page is registered in `content.json` with a `seeded` flag.
2. Content lives in `content/[type]/[slug].md` as markdown.
3. `node build.js` renders all pages into `public/`:
   - **Seeded pages**: full content, `index, follow`, in sitemap.xml
   - **Unseeded pages**: placeholder ("Coming soon"), `noindex, nofollow`, excluded from sitemap
4. Build also generates `sitemap.xml`, `robots.txt`, and injects JSON-LD structured data (Organization, WebSite, FAQPage, Article, BreadcrumbList).

## Seeding Content (How to Publish a Page)

1. Write the content in `content/[type]/[slug].md` (human-written, no AI).
2. In `content.json`, set `"seeded": true` for that page.
3. Run `npm run build`.
4. Commit and push — Vercel auto-deploys.

## Local Development

```bash
npm install
npm run build
# open public/index.html or serve: npx serve public
```

## Deployment

### Via Vercel Dashboard (easiest)

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) → Import the repo.
3. Settings are already in `vercel.json` (build command `node build.js`, output `public`).
4. Add your domain `umbrella.lgbt` under Project → Settings → Domains.
5. Vercel provisions SSL automatically.

### Via Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

### GitHub Actions CI

A workflow in `.github/workflows/ci.yml` verifies the build passes on every push/PR. No secrets needed — it only runs `npm ci && npm run build`.

## Contact

- Email: hello@umbrella.lgbt
- X: @cocortech
