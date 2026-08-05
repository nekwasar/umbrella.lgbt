# M8 — Post-Launch Runbook (Deploy → Indexing → Monitoring)

Status: **DEPLOYED — live at https://um-six.vercel.app.** Custom domain pending one DNS change at Spaceship (see Step 1c).

---

## Step 0 — Verified Already

| Item | Status |
|------|--------|
| Repo on GitHub | ✓ `nekwasar/umbrella.lgbt` |
| CI (build + output check) | ✓ passing |
| X account @cocortech | ✓ exists (verified HTTP 200) |
| Vercel production deploy | ✓ LIVE at https://um-six.vercel.app |
| GitHub ↔ Vercel auto-deploy | ✓ connected (pushes to main deploy automatically) |
| Domain umbrella.lgbt | ✓ added to Vercel — **DNS pending** |

---

## Step 1 — Deploy to Vercel ✅ DONE

Production deployment is live. All pages, assets, sitemap, and robots.txt verified (HTTP 200).

## Step 1c — Custom Domain (needs you, 5 min at Spaceship)

Domain is added to Vercel but the nameservers are still at Spaceship (`launch1/launch2.spaceship.net`). Do ONE of:

**Option A (recommended)** — At Spaceship, add this DNS record:
```
Type: A      Name: @ (or umbrella.lgbt)      Value: 76.76.21.21
Type: CNAME  Name: www                        Value: cname.vercel-dns.com
```

**Option B** — Change nameservers at Spaceship to:
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

Vercel verifies automatically (check the email / dashboard). Once verified, the site is live at **https://umbrella.lgbt** and `robots.txt` + `sitemap.xml` point at the right domain automatically.

Then continue to indexing steps below.
1. Vercel → Project → **Settings → Domains** → Add `umbrella.lgbt`
2. Follow Vercel's DNS instructions at your registrar (CNAME `cname.vercel-dns.com` or nameserver swap)
3. SSL is provisioned automatically (wait up to a few hours for the cert)

**Verify live:** `curl -sI https://umbrella.lgbt | head -1` → `200 OK`, and `https://umbrella.lgbt/sitemap.xml` serves XML.

---

## Step 2 — Google Search Console (20 min)

1. Go to **search.google.com/search-console** → sign in (use a Google account that will own the domain long-term).
2. Add property: **URL prefix** → `https://umbrella.lgbt`.
3. Verification method: choose **DNS** (CNAME `google-site-verification=...` at Spaceship) — or HTML file (download, place in `static/`, run `npm run build`, push — Vercel deploys, then click Verify).
4. Once verified: **Sitemaps** → submit `sitemap.xml` → Google shows **162 URLs** (all pages are now seeded and indexable).
5. **URL Inspection** tool → paste URLs from `docs/urls-to-index.md` (now 162 URLs — regenerate with `grep -oP '<loc>\K[^<]+' public/sitemap.xml`) → **Request Indexing**.
6. Enable **Email notifications** (Settings → Preferences) so you see crawl errors.

**Checklist after 1 week:** Search Console → Coverage → all URLs indexed; Performance → first queries appearing.

---

## Step 3 — Bing Webmaster Tools (10 min)

1. **bing.com/webmasters** → sign in (Microsoft account).
2. Add site → **Import from Google Search Console** (fastest — pulls property + verification).
3. Otherwise: add `https://umbrella.lgbt`, use CNAME verification.
4. Submit `sitemap.xml`.
5. Paste the URL list from `docs/urls-to-index.md` in **URL Submission**.

---

## Step 4 — UptimeRobot Monitoring (5 min)

1. **uptimerobot.com** → sign up (free tier: 50 monitors).
2. **Add New Monitor:**
   - Type: **HTTPS**
   - URL: `https://umbrella.lgbt`
   - Interval: 5 minutes
   - Alert contacts: your email
3. Add a second monitor:
   - Type: **Keyword**
   - URL: `https://umbrella.lgbt`
   - Keyword: `Umbrella`
   - Alert when: keyword **not exists** (catches silent content failures, not just 500s)

---

## Step 5 — X (@cocortech) — Already Exists

Account verified live. Next actions (manual, when ready):
- Pin a post linking `https://umbrella.lgbt` + the manifesto
- Post each new seeded page with a link (weekly cadence)

---

## Step 6 — Weekly Content Cadence (months 1–12)

From `s-plans.md` M9: seed 4–5 pages/week. Priority order:
1. Q&A (high SEO value, FAQ schema)
2. Glossary
3. Blog
4. Cities
5. Resources

After each seeding batch: `npm run build`, commit, push (Vercel auto-deploys, sitemap auto-regenerates — Google will pick up new URLs on next sitemap crawl; no manual resubmit needed).

---

## Failure Recovery

| Failure | Fix |
|---------|-----|
| Vercel build fails | Check CI first — same commands (`npm ci && npm run build`) |
| Page returns 404 in production | `cleanUrls` rewrites `/x` → `/x.html`; run `node build.js` to regenerate |
| New seeded page not in sitemap | Did you set `"seeded": true` in `content.json`? |
| Missing CSS/JS | Run `node build.js` — static files copy from `static/` |
