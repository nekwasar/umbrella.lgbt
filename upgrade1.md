# Umbrella.lgbt — Upgrade 1 Spec

> **Status:** Approved plan (M0–M7 + Phase 2). This document captures everything decided for Upgrade 1.
> **Goal:** Turn the static pre-launch site into a dynamic, SEO-hyper platform with a full admin CMS and live Q&A.

---

## 1. What Upgrade 1 Delivers

1. **Admin CMS** — edit all pages + content + every meta field (content prefilled in a form), create new pages via a form.
2. **Meta details everywhere** — every possible SEO meta field, editable per page (including dynamic pages via a meta-only editor).
3. **Dynamic Q&A** — questions, answers, votes, nested comment threads. Anonymous users can reply to comments.
4. **No moderation queue** — all posts (including anonymous and new users) auto-publish. Admin has reactive tools only (remove/ban).
5. **Related posts** — manual + auto-suggested internal linking.
6. **Glossary upgrade** — managed in admin, cross-linked with Q&A, richer schema.
7. **SEO hyper** — full metadata, JSON-LD (incl. QAPage), dynamic sitemap/robots, canonical preservation, URL continuity.
8. **Modern admin UX/UI** — the page editor is form-based but must look modern, polished, and have excellent UX.

**Out of scope for Upgrade 1:** public user profiles, Meet, Community, Chats, and the general site UI overhaul — those are **Phase 2**.

---

## 2. Target Architecture

```
[Vercel]  Next.js frontend (SSR/ISR for SEO, /admin dashboard, public Q&A)
    │  HTTPS (api.umbrella.lgbt)
    ▼
[VPS]     Docker (per-app compose stack, shared reverse proxy on VPS)
    ├── umbrella-api     Node.js API (Express + Prisma + JWT)
    ├── umbrella-db      PostgreSQL 16 (volume-persisted)
    └── (proxy)          Caddy/Traefik → terminates SSL for api.umbrella.lgbt
```

- **Frontend stays on Vercel.** Backend + DB run on the user's VPS in Docker (same VPS hosts many other applications this way).
- Same URLs preserved: `/qa/*`, `/blog/*`, `/glossary/*`, `/city/*`, `/resources/*`, `/about` … → **no SEO loss**.
- Editorial pages (blog/core/glossary/city/resources) → **SSG/ISR** (fast, indexed).
- Dynamic Q&A pages → **SSR/ISR** so Google indexes live questions and answers.
- Repo becomes a **monorepo**: `apps/web` (Next.js), `apps/api` (backend), `infra/` (docker-compose).

---

## 3. Admin CMS

### 3.1 Auth
- Username + password only.
- Multiple admins supported, roles: `SUPER_ADMIN`, `ADMIN`.
- Admins are created in the admin dashboard by an existing admin.
- Main/super admin is seeded directly via environment variables.
- Sessions via JWT in httpOnly cookie; bcrypt password hashing; CORS restricted to the site.

### 3.2 Page Editor (create / edit) — Form-Based
- **Create new page = a form**: every detail has its own labeled input (type, slug, title, topic, category, date, author, status, content, and all meta fields). Slug auto-suggested from title (editable).
- **Edit page = the same form**, with content and every field **prefilled**.
- Content: markdown in a textarea with a **live preview**.
- Meta details: one input per field (see §5), clearly grouped.
- **Design requirement:** even though it is a form, it must look **modern** and have **very good UX/UI** — clear labels, grouped sections, validation feedback, autosave/save state, good typography and spacing.

### 3.3 Meta-Only Editor
- A separate admin section to edit **meta details only** (title, description, og, twitter, robots, canonical, etc.) of **dynamic pages** (and any page), without touching body content.
- Table/list view with inline editing or a quick-form per page, bulk-capable.

### 3.4 Admin Dashboard
- Stats: page counts by type, seeded/published status, question count, answer/comment counts.
- Content manager: list/filter/search pages by type + status; jump to edit.
- Admin management: create/remove admins, change passwords.
- **Reactive moderation tools** (no queue): remove any question/answer/comment, ban a user, view reported content.

---

## 4. Dynamic Q&A

- Public pages, no login required to read. Google-indexed (QAPage schema).
- **Ask a question** — requires account.
- **Post an answer** — requires account.
- **Upvote / downvote answers** — requires account; one vote per user per answer.
- **Best answer** — pinned by question author or admin.
- **Nested comment threads** — logged-in users can comment; **anonymous users CAN reply to comments** (nested replies).
- **No moderation queue** — every post auto-publishes immediately, including anonymous replies and brand-new users.
- Questions have topics/tags; browse by topic; search; related questions sidebar.
- URL structure: `/qa/[slug]` (SEO-friendly slug).

### Public User Accounts (minimal, for Q&A only)
- `users`: username, optional email, password_hash, display_name, pronouns, is_banned.
- Register / login / logout. No profiles, Meet, or Community yet (Phase 2).

---

## 5. Full Meta Field List (per page, editable)

- **Basics:** `meta_title`, `meta_description`, `keywords[]`
- **Indexing:** `canonical_url`, `robots`, `noindex`, `nofollow`
- **Open Graph:** `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `og:site_name`, `og:locale`
- **Twitter:** `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`, `twitter:site`, `twitter:creator`
- **Structured data:** `jsonld_type`, `jsonld_extra` (jsonb)
- **Geo (city pages):** `geo_region`, `geo_placename`, `geo_position`, `icbm`
- **Alternates:** `hreflang[]`, `alternate_urls[]`
- **Attribution/dates:** `author_name`, `published_time`, `modified_time`
- **Media:** `og_image_alt` / `image_alt`

Admin auto-suggests defaults from content; manual override always wins. Nothing ships with duplicate/generic titles.

---

## 6. SEO Hyper Layer

1. Next.js `Metadata API` (`generateMetadata`) per page type with smart fallbacks from DB meta.
2. JSON-LD per type: **Organization, WebSite, WebPage, Article** (blog), **FAQPage** (static Q&A), **QAPage** (dynamic questions w/ answers), **BreadcrumbList** (all), **ItemList** (index pages), geo tags on city pages.
3. Dynamic `sitemap.xml` + `robots.txt` (replaces build-time generation).
4. Canonical preservation + exact URL continuity + redirect map (old static → new).
5. Internal linking: related posts (manual + auto by topic/category), cross-links Q&A↔glossary↔blog (recreate the current build's behavior), breadcrumbs everywhere.
6. Link checker + schema validator + Lighthouse as CI gates.

---

## 7. Database Schema (PostgreSQL)

- **`admins`** — id, username, password_hash, role (`SUPER_ADMIN|ADMIN`), last_login_at
- **`users`** — id, username, optional email, password_hash, display_name, pronouns, is_banned, created_at
- **`pages`** — id, type (`core|blog|qa|glossary|city|resources`), slug, title, content_md, status (`draft|published`), seeded, topic, category, date, author, reading_time, published_at, timestamps
- **`page_meta`** (1:1 with page) — all fields from §5
- **`page_relations`** — page_id, related_page_id (related posts, manual + auto)
- **`questions`** — id, user_id, title, slug, body_md, topic, status, view_count, best_answer_id, timestamps
- **`answers`** — id, question_id, user_id, body_md, votes, is_best, timestamps
- **`answer_votes`** — id, answer_id, user_id, value (1|-1), unique(user_id, answer_id)
- **`comments`** — id, target_type (`question|answer`), target_id, parent_id (nesting), user_id (nullable = anonymous), author_name, body_md, timestamps
- **`reports`** — id, target_type, target_id, reporter_id, reason, status

---

## 8. Backend API (Node + Express + Prisma)

- **Admin auth:** `POST /auth/admin/login`, `/logout`, `GET /auth/admin/me`
- **User auth:** `POST /auth/register`, `/login`, `/logout`, `GET /users/me`
- **Admin content:** CRUD `pages`, `PATCH /admin/pages/meta` (meta-only bulk), CRUD `/admin/admins`, content removal + user ban
- **Public Q&A:** `GET /qa` (topic filter, search, paginate), `GET /qa/:slug` (question + answers + comments + votes), `POST /qa` (ask, auth), `POST /qa/:slug/answers` (auth), `POST /answers/:id/vote` (auth), `POST /comments` (auth for top-level, anonymous allowed for replies)
- **Public content:** `GET /pages` (per type), `GET /pages/:slug` (with meta + related)
- Security: bcrypt, JWT expiry/rotation, rate limiting on auth/comments, Zod validation, Prisma-only SQL, CORS restricted to site.

**Infra:** `infra/docker-compose.yml` (api + postgres + caddy), `.env` gitignored, healthcheck endpoint, `pg_dump` backup cron, multi-stage Dockerfile.

---

## 9. Frontend Pages (Next.js)

- Home, `/about /features /waitlist /press /contact /privacy`
- `/blog` + `/blog/[slug]`, `/glossary` + `/glossary/[slug]`, `/city` + `/city/[slug]`, `/resources` + `/resources/[slug]`
- `/qa` + `/qa/[slug]` + `/qa/ask`
- `/search`, `/register`, `/login`
- `/admin/*` dashboard, content manager, page editor, meta-only editor, admins, moderation
- `app/sitemap.ts`, `app/robots.ts`
- Port the retro design + dark mode + mobile menu from current `static/scripts/main.js`; home previews read from DB.

---

## 10. Migration

Script reads existing `content.json` + `content/*.md` → seeds `pages` + `page_meta` (extract title/desc/topic/category/date), preserves slugs/types, sets seeded=true. Run once after schema is live.

---

## 11. Execution Milestones

| # | Milestone | Key steps |
|---|-----------|-----------|
| 0 | Infra & scaffold | Monorepo, docker-compose (api+db+caddy), env/secrets, healthcheck, CI |
| 1 | DB + auth | Prisma schema, migrations, admin login (env-seeded superadmin), public user register/login |
| 2 | Content API + migration | pages CRUD + full meta, import 156 pages, related-posts API |
| 3 | Admin CMS | dashboard, form-based page editor (create = blank form, edit = prefilled, one input per field, modern UX/UI), meta-only bulk editor, admin management, remove/ban tools |
| 4 | Dynamic Q&A | ask/answer/vote/nested comments (all auto-publish incl. anonymous), Q&A pages SSR, search/topics/related |
| 5 | Frontend rebuild | port templates → Next.js components (retro design + dark mode), home previews from DB |
| 6 | SEO hyper | Metadata API per type, JSON-LD (incl. QAPage), dynamic sitemap/robots, canonical/redirect map, link checks |
| 7 | Deploy + hardening | VPS deploy via CI, Vercel env + deploy, backups, rate limits, monitoring |

Each milestone ends deployable so the live site never breaks; frontend swap is a cutover at end of M5.

---

## 12. Phase 2 (Later, After Upgrade 1)

- Site-wide **UI upgrade** on top of the new architecture (modern look + UX refresh across public pages).
- Public user profiles, Meet, Community, Chats, and the rest of the full app vision from `features.md` / `product-spec.md`.

---

## 13. Confirmed Decisions

- Frontend on Vercel; backend + Postgres in Docker on the user's VPS.
- Monorepo in the existing `umbrella.lgbt` repo (`apps/web`, `apps/api`, `infra/`).
- Stack: Next.js (App Router) + Express + Prisma + PostgreSQL + JWT.
- Admin: username/password, multi-admin, superadmin via env, created-in-dashboard.
- Admin page editor: form-based, one input per field, prefilled on edit, **modern UI/UX required**.
- Meta-only editor section for dynamic pages.
- Q&A: account required to ask/answer/comment top-level; **anonymous users can reply to comments**; **no moderation queue — everything auto-publishes**; admin can remove/ban reactively.
- Images: Vercel Blob (frontend on Vercel) — fallback backend storage if needed.
- Full meta field list per §5; SEO hyper layer per §6.
