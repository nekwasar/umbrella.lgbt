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
  pride flag vars `var(--flag-red/orange/yellow/green/blue/purple)` (fixed both themes,
  wordmark letters ONLY), header vars `var(--hotpink)` `#e60067` / `var(--pastel)`
  `#ffe4e1` / `var(--magenta)` `#b30059`, bevel vars `var(--btn-face)` /
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
- Header (two-tone, SpaceHey-style): hot-pink `.top-banner` (`var(--hotpink)`
  background, solid cream `.wordmark`, user links) + pastel `.subnav`
  (`var(--pastel)` background, 2px hotpink bottom border) with pipe-separated links
  (`Home | About | …`, separators are literal `|` in `.sep` spans) in deep magenta
  (`var(--magenta)`), underline on hover. NO top-bar + hamburger pattern — the subnav
  wraps on narrow screens instead. NEVER rebuild header/footer/nav inside a page
  (they live in the `(public)` layout + `PublicHeader`).
- Section headers: `.band` = full-width SOLID pastel bar (`var(--pastel)` background,
  `var(--magenta)` text/border), bold left-aligned uppercase text. Links inside bands
  use magenta. NEVER gradient/muted/dark bands (the old `.band.rainbow` is deleted).
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
  `.muted` / `.faint` / `.meta`, `.hr` / `.pixel-divider`, `.wordmark` with one
  flag class per letter (U red, m orange, b yellow, r green, e+l blue, l+a purple).
  `.rainbow-strip` = 3px solid hotpink divider; `.rainbow-frame` = 2px solid hotpink
  frame (doubles as best-answer highlight via `.card.rainbow-frame`). Focus ring is
  global (2px pink) — don't remove it.
- Structure content pages like `blog/[slug]/page.tsx`: `Breadcrumbs` → `ArticleView`
  (detail) or `TypeIndexView` (index) → related/cross-link sections via `.band` + `.row-list`.
- Dark mode works ONLY through the variables (`[data-theme='dark']`). Hardcoded colors
  break it. Narrow screens: subnav wraps, bands/cards go full width — check 360px wide.
- Every public page MUST have `generateMetadata` via `pageMetadata()` (`@/lib/meta`),
  `Breadcrumbs`, and the matching JSON-LD block (`@/lib/seo`).
- Data: fetch in server components via `@/lib/data` (`fetchPublicPage`, `apiFetch`);
  `export const revalidate = 300`; call `notFound()` when the API returns null.

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
