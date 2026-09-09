# AGENTS.md — umbrella.lgbt

## UI consistency (mandatory for every new page)

This site has TWO design systems. Every new page MUST use the one matching its area.
Never mix them. Never invent new styles, colors, or primitives.

### Public pages (`apps/web/src/app/(public)/`, `src/components/public/`)

Authentic mid-2000s Web 2.0 / MySpace retro (SpaceHey-like). Source of truth:
`src/app/globals.css`. NO modern flat/pill/gradient patterns anywhere on public pages.

- Colors: CSS variables ONLY — `var(--bg)`, `var(--surface)`, `var(--surface-2)`,
  `var(--ink)`, `var(--muted)`, `var(--faint)`, `var(--line)`, `var(--line-strong)`,
  `var(--pink)`, `var(--purple)`, `var(--blue)`, `var(--green)`, `var(--gold)`,
  `var(--brown)` (+ `var(--brown-soft)` bg), `var(--link)` (classic `#0000ee`),
  wordmark letter hues (exact fixed hexes, both themes — see `.wm-*` classes),
  header vars `var(--hotpink)` `#e60067` / `var(--pastel)`
  `#ffe4e1` / `var(--magenta)` `#b30059`, soft-pink theme vars `var(--softpink)`
  `#fabbd1` / `var(--wine)` `#5c062c` / `var(--creampink)` `#fff5f8` /
  `var(--bandline)` `#e09db5` (fixed both themes), bevel vars `var(--btn-face)` /
  `var(--btn-hi)` / `var(--btn-lo)`. NEVER hardcode hex/rgb. NEVER introduce a new color.
  NEVER use CSS gradients (the one exception is the hard-stop `.pixel-divider` pattern).
- Corners: `border-radius: 0` on ALL cards, buttons, inputs, containers. No rounded
  corners, no pills (`.tag` is square). No gradients except `var(--rainbow)` accents.
- Type: `Arial, Tahoma, Verdana, sans-serif`; 13px body, `line-height: 1.3`;
  h1 26px / h2 20px / h3 15px, bold, ink. NO wide `letter-spacing` (must be 0).
  Left-align body text — NEVER center content panels, heroes, or empty states.
- Links: `var(--link)`, NO underline by default, underline on hover. (Exception: links
  sitting on dark strips — `.band a`, `.banner-link` — use the light strip/banner text
  color instead so they stay readable.)
- Header (two-tone, SpaceHey-style): soft-pink `.top-banner` (`var(--softpink)`
  background, `logo-icon.svg` rainbow-"U" badge — NOT the text `.wordmark`, which
  lives on in the hero + footer). Top-right account links are plain wine text
  (`var(--wine)`): `Sign in | Join` (`.banner-text-link` + `.banner-sep`), or `@user` +
  text `Sign out` (`.banner-text-btn`) — NEVER button boxes up there. Dark mode has
  NO header control; it lives in the footer as plain text (`ThemeToggle`: "Theme:
  Light / Dark" beside the copyright, active option bold text, other a link).
  The banner also holds a classic search row (`.banner-search` with
  8px top/bottom padding, full-width flex: "Search Topics:" wine nowrap label + white
  input with 1px wine border (`flex: 1`) + flat grey `.btn-search` (`#e0e0e0` bg,
  1px `#666` border, sharp corners), GETs to `/search?q=`).
  Cream-pink `.subnav` (`var(--creampink)` background, 2px hotpink bottom border,
  `padding: 6px 10px`) holds pipe-separated links (`Home | About | …`, separators are
  literal `|` in `.sep` spans with `margin: 0 6px`) in ink, pink hover with underline
  (dark mode: vivid magenta links, near-white-pink hover — cream washes out on the
  dusty-rose bar);
  the subnav scrolls horizontally on small screens (`overflow-x: auto`,
  `white-space: nowrap`, no wrapping). NEVER rebuild header/footer/nav inside a page
  (they live in the `(public)` layout + `PublicHeader`).
- Section headers: `.band` = full-width SOLID soft-pink bar (`var(--softpink)`
  background, `var(--wine)` text, `var(--bandline)` border), bold left-aligned
  uppercase text. Links inside bands use wine. Sidebar `.sidebox-hd` and
  `.portal-table th` use the same treatment. NEVER gradient/muted/dark bands
  (the old `.band.rainbow` is deleted).
- Buttons: `.btn` = classic 4-sided bevel (`--btn-hi` top/left, `--btn-lo`
  bottom/right), flat `--btn-face` fill; `:active` inverts the bevel (pressed look),
  NEVER translate/scale animations. `.btn-solid` = flat high-contrast solid block.
  `.btn-block` = full-width. NEVER pill buttons, NEVER gradient buttons.
- Containers: 1px solid borders (`--line` / `--line-strong`), compact padding
  (`.card` 6px 8px, `.card-flat` 8px, `.container` side padding 8px). Dense and
  structured, no airy whitespace.
- Other blocks (reuse, don't reinvent): `.input` / `.textarea` / `.select` + `.label`,
  `.tag` (+ `-pink`/`-purple`/`-blue`/`-green`/`-gold`/`-brown`; topic/identity
  tags use `-brown`, `-green` = best-answer only), `.table`, `.row-list`,
  `.md-preview` (markdown body), `.alert` / `.alert-error` / `.alert-success`,
  `.muted` / `.faint` / `.meta`, `.hr` / `.pixel-divider`, `.wordmark` with the exact
  per-letter sequence (U red `#ff0000`, m orange `#ff8c00`, b yellow `#ffd700`,
  r green `#008000`, e cyan `#00bfff`, l royal `#0000cd`, l indigo `#4b0082`,
  a violet `#9400d3` — no two adjacent letters share a hue; `logo-icon.svg` is a
  copy of the favicon art with the same 7 hues as gradient stops).
  `.rainbow-strip` = 3px solid hotpink divider; `.rainbow-frame` = 2px solid hotpink
  frame (doubles as best-answer highlight via `.card.rainbow-frame`). Focus ring is
  global (2px pink) — don't remove it.
- Structure content pages like `blog/[slug]/page.tsx`: `Breadcrumbs` → `ArticleView`
  (detail) or `TypeIndexView` (index) → related/cross-link sections via `.band` + `.row-list`.
- Dark mode works ONLY through the variables (`[data-theme='dark']`). Hardcoded colors
  break it. Narrow screens: subnav scrolls sideways, bands/cards go full width — check 360px wide.
- Every public page MUST have `generateMetadata` via `pageMetadata()` (`@/lib/meta`),
  `Breadcrumbs`, and the matching JSON-LD block (`@/lib/seo`).
- Data: fetch in server components via `@/lib/data` (`fetchPublicPage`, `apiFetch`);
  `export const revalidate = 300`; call `notFound()` when the API returns null.

### Desktop portal (homepage, ≥992px only)

- Mobile-first: everything stacks single-column below 992px. The 3-column grid, the
  1140px container, and all multi-column structure live inside
  `@media (min-width: 992px)` — NEVER apply portal layout to mobile.
- Grid: `.portal` with areas `left main right` at `4fr 11fr 5fr` (≈20/55/25).
  DOM order is main → left → right so mobile reads hero-first. All three columns need
  `min-width: 0`. NEVER reorder with flex `order`.
- Sidebar modules: `.sidebox` (1px hotpink border) + `.sidebox-hd` (pastel bg, magenta
  text/border-bottom, bold uppercase, left) + `.sidebox-bd` (6px 8px body). This is the
  ONLY approved sidebar container — never bare divs or `.card` in sidebars.
- Tables: `.portal-table` — 1px hotpink grid, pastel/magenta header row, alternating
  `--alt-row` / `--surface` body rows. NEVER borderless or striped-grey tables.
- Lists: `.dir-list` with `»` bullets (`.bullet` span, hotpink) for directories;
  `.mini-list` (dotted separators) for announcements/discussions; tiny `.tag` chips for
  counts/dates.
- One-offs: `.bulletin` (2px hotpink border, pink-soft bg, `[ BULLETIN: … ]` title) for
  site news; `.badge-bar` + `.badge88` (+ `-pink`/`-blue`/`-green`) for 88×31 buttons.
- New homepage widgets fetch via the existing `@/lib/data` helpers with `revalidate = 300`;
  static editorial lists (directory, announcements) live as consts at the top of `page.tsx`.

### Admin pages (`apps/web/src/app/admin/`, `src/components/admin/`)

Modern rounded console. Source of truth: `apps/web/tailwind.config.ts` +
`src/components/admin/ui.tsx`.

- Colors: Tailwind tokens ONLY — `canvas, surface, line, line-strong, ink, muted, faint,
  brand, brand-soft, accent, good, warn`. NEVER arbitrary `bg-[#...]` outside `ui.tsx`.
- Corners: `rounded-card` for cards, `rounded-lg` for inputs/banners/buttons.
  NEVER square off admin UI.
- Primitives (ALWAYS use, never raw elements): `PageHeader` (title + subtitle + actions),
  `Card`, `Field` + `Input`/`Textarea`/`Select`/`Checkbox`, `Button`
  (`primary`/`secondary`/`danger`/`ghost` + `loading`), `Badge`
  (`neutral`/`good`/`warn`/`brand`), `Banner` (`error`/`success`/`info`, has
  `role="alert"`), `EmptyState`, `Spinner`.
- Errors: catch with `toApiError(err, METHOD, PATH)` from `@/lib/api`; render
  `error.summary` plus a `<pre>` of `error.detail`. Never swallow errors into generic text.
- Admin shell (sidebar nav + `noindex`) is automatic via `src/app/admin/layout.tsx`.
  NEVER place admin pages outside `src/app/admin/`, NEVER make them indexable.

### Cross-cutting

- `@/*` maps to `apps/web/src/*`. Prefer server components; `'use client'` only for
  interactivity. Mutations go through `api()` (`@/lib/api`, sends cookies).
- `.gitignore` anchors the legacy static output as `/public/`. NEVER add a bare `public/`
  ignore — it would hide `src/components/public/` from git.
- Verify every UI change with `npx tsc --noEmit` in `apps/web`; if routes changed,
  `npm run build` there too.
