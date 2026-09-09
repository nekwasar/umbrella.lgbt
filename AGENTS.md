# AGENTS.md — umbrella.lgbt

## UI consistency (mandatory for every new page)

This site has TWO design systems. Every new page MUST use the one matching its area.
Never mix them. Never invent new styles, colors, or primitives.

### Public pages (`apps/web/src/app/(public)/`, `src/components/public/`)

Retro SpaceHey / early-2000s aesthetic. Source of truth: `src/app/globals.css`.

- Colors: CSS variables ONLY — `var(--bg)`, `var(--surface)`, `var(--surface-2)`,
  `var(--ink)`, `var(--muted)`, `var(--faint)`, `var(--line)`, `var(--line-strong)`,
  `var(--pink)`, `var(--purple)`, `var(--blue)`, `var(--green)`, `var(--gold)`,
  `var(--rainbow)`. NEVER hardcode hex/rgb. NEVER introduce a new color.
- Corners: `border-radius: 0` everywhere. No rounded corners, no pills (`.tag` is square).
- Building blocks (reuse, don't reinvent): `.card`, `.card-flat`, `.band` (uppercase
  section header), `.btn` / `.btn-solid` / `.btn-block`, `.input` / `.textarea` / `.select`
  + `.label`, `.tag` (+ `-pink`/`-purple`/`-blue`/`-green`/`-gold`), `.table`, `.row-list`,
  `.md-preview` (markdown body), `.alert` / `.alert-error` / `.alert-success`,
  `.muted` / `.faint` / `.meta`, `.hr` / `.pixel-divider`, `.wordmark` +
  `.wm-pink`/`.wm-purple`/`.wm-blue`, `.rainbow-strip` / `.rainbow-frame`.
- Links: blue + underline, hover pink. Focus ring is global (2px pink) — don't remove it.
- Type: Arial/Helvetica, 13px body; h1 26px / h2 20px / h3 15px, bold, ink color.
- Layout comes from the `(public)` route-group layout (`PublicHeader`, rainbow strip,
  `.container`, footer). NEVER rebuild header/footer/nav inside a page.
- Structure content pages like `blog/[slug]/page.tsx`: `Breadcrumbs` → `ArticleView`
  (detail) or `TypeIndexView` (index) → related/cross-link sections via `.band` + `.row-list`.
- Dark mode works ONLY through the variables (`[data-theme='dark']`). Hardcoded colors
  break it. Responsive collapse is at 760px (nav → hamburger) — check narrow widths.
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
