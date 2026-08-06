# Full Codebase Audit — Qarinha (دفتر البيت Price-Comparison App)

**Scope:** read-only audit of all tracked files. **No fixes made.**

Findings grouped into 8 requested areas, ordered by severity (Critical → High → Medium → Low) within each. Web-backed findings carry a `Source:` line.

---

## Area 1 — Frontend Components & Pages

### [LOW] `useScraper` relevance filter diverges from scraper-service default

**File:** `components/useScraper.ts`
**Issue:** Frontend `filterByRelevance` uses `minRelevance = 0.5` and sorts `a.price - b.price`. The scraper-service `scrape-runner.ts` / `src/index.ts` use `MIN_RELEVANCE = 0.3` and also sort by price. The two thresholds are not in sync — a product the scraper keeps (0.3–0.5) is silently dropped client-side.
**Why it matters:** Inconsistent search results between the GitHub-Actions path and the local in-process path; users see fewer products than the backend prepared.
**Suggested direction:** Export `MIN_RELEVANCE` from one shared place and consume it in both, or have the scraper return `relevance` per product and let the client filter with the same constant.

### [LOW] `key={p.url}-${i}` index-in-key in results list

**File:** `app/search/page.tsx`
**Issue:** Product list uses `key={p.url}-${i}`. Index-in-key defeats React reconciliation when the list re-orders (e.g. re-sort by price), causing remounts / lost state.
**Why it matters:** Minor perf + flicker; can also break focus on re-render.
**Suggested direction:** Use a stable product key (e.g. `url` alone, or `url + seller`) — include index only as a tiebreaker when duplicates are possible.

### [LOW] Dead demo/test pages shipped to production

**Files:** `app/test/page.tsx`, `app/search-test/page.tsx`
**Issue:** `test/page` renders the static demo dataset from `lib/products.js` and uses `https://via.placeholder.com/200x200?text=No+Image`; `search-test` wires a fake search into the same data. Both are still routable in production.
**Why it matters:** External placeholder dependency (`via.placeholder.com`) at runtime, dead routes that should not be user-visible.
**Suggested direction:** Delete both routes and `lib/products.js`, or gate them behind `NODE_ENV !== 'production'` / a feature flag.

### [LOW] Non-existent `/profile` route linked in user menu

**File:** `components/UserMenu.tsx`
**Issue:** Menu links to `/history` and `/profile`, but no `/profile` page exists in `app/`.
**Why it matters:** Users who click get a 404 — broken navigation in the primary menu.
**Suggested direction:** Create the profile page or remove/retarget the link.

### [LOW] Broken newsletter form + placeholder social links

**File:** `components/Footer.tsx`
**Issue:** Newsletter `<input>` has no `type`, no label, and no submit handler/action — a dead form. Social links use `href="#"`.
**Why it matters:** Dead UI in the footer; `href="#"` scrolls to top.
**Suggested direction:** Wire the form to a real action (or remove it) and point social links at real URLs.

### [LOW] `sitemap.ts` includes login/register at priority 0.5

**File:** `app/sitemap.ts`
**Issue:** Auth pages (`/login`, `/register`) are listed in the sitemap at 0.5 priority.
**Why it matters:** Useless for SEO; wastes crawl budget on pages that should be `noindex`.
**Suggested direction:** Drop auth pages from the sitemap (or set them `noindex`).

### [LOW] `robots.ts` allows `/api/`, `/test`, `/search-test`

**File:** `app/robots.ts`
**Issue:** These paths are not disallowed.
**Why it matters:** `/api/` shouldn't be indexed; and if the demo pages are removed per above this is moot. Minor SEO hygiene.
**Suggested direction:** Disallow `/api/`, `/test`, `/search-test`.

---

## Area 2 — Mobile / Responsive

### [LOW] Product grid forces 2 columns on smallest viewports

**File:** `app/search/page.tsx` (grid classes `grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`)
**Issue:** On very narrow screens the grid stays 2 columns.
**Why it matters:** Cards get cramped on small phones (esp. with RTL Arabic long titles).
**Suggested direction:** Consider `grid-cols-1` at the base breakpoint, or verify 2-up fits at the target minimum width.

### [LOW] Header nav / mobile menu complexity

**Files:** `components/Header.tsx`, `components/UserMenu.tsx`
**Issue:** Header includes a search overlay (z-100), mobile hamburger menu, scroll-direction behavior, plus a separate user dropdown. Multiple overlapping state paths to keep in sync.
**Why it matters:** More surface for z-index/focus bugs on mobile; not a correctness bug today.
**Suggested direction:** Consolidate overlay + mobile menu into one open state; test keyboard focus handling when overlays open/close.

---

## Area 3 — Styling

### [LOW] `tailwind.config.ts` is effectively dead config

**File:** `tailwind.config.ts`
**Issue:** Minimal config with an empty `theme`; Tailwind v4 (via `@tailwindcss/postcss` + `globals.css` with `@custom-variant`) does CSS-first config, so this file has no effect.
**Why it matters:** Mismatch risk — devs may assume it controls colors/tokens and be surprised nothing changes.
**Suggested direction:** Delete the file, or migrate design tokens into `@theme` inside `globals.css` and align `components.json`.

### [LOW] `components.json` metadata drift (`baseColor: neutral`, `rtl: false`)

**File:** `components.json`
**Issue:** The shadcn registry metadata says `rtl: false` while the app is RTL (Arabic), and lists `tailwind.config.ts` (dead, see above).
**Why it matters:** Future `shadcn add` will generate components with the wrong direction assumption.
**Suggested direction:** Update `rtl: true` and the tailwind field to match the real setup.

### [LOW] Manifest theme color inconsistent with UI

**File:** `app/manifest.ts`
**Issue:** Manifest is themed dark (`#0f172a` etc.) while the app's visible theme is light cream.
**Why it matters:** PWA install/browser chrome color mismatches the app; cosmetic.
**Suggested direction:** Align manifest colors with the actual theme tokens.

### [LOW] Inline shader / heavy WebGL component on landing

**File:** `components/LightRays.tsx`
**Issue:** A full OGL/WebGL ray shader runs on the landing page (with mouse tracking, `requestAnimationFrame` loop, intersection-observer gating).
**Why it matters:** Battery/GPU cost on mobile; the heavy inline GLSL source is embedded in the component.
**Suggested direction:** Confirm the visual is worth the cost; consider disabling on `prefers-reduced-motion` and low-power devices, and lazy-load so it never blocks paint.

---

## Area 4 — Backend API Routes

### [CRITICAL] Scrape job created fire-and-forget after response — quota race / data loss

**File:** `app/api/scrape/route.ts`
**Issue:** The route calls `connectDB().then(...ScrapeJob.create...)` without awaiting it, then returns the JSON response. Quota `remaining` is computed from `countDocuments` on `AuditLog` *before* the current job is recorded.
**Why it matters:**
- Concurrent scrapes can exceed quota (check-then-act race).
- Cold DB connection + early return can drop the job with no error surfaced.
- The response is delivered before the job doc exists, so the client's first status poll can 404.
**Suggested direction:** `await` the DB persistence + quota increment *before* returning; return a proper error path if `ScrapeJob.create` fails.

### [HIGH] Quota check is check-then-act, not atomic

**Files:** `lib/quota.ts`, `lib/audit.ts`, `lib/db/models.ts`
**Issue:** Quota is enforced by `countDocuments` over `AuditLog` then incrementing; the check and the increment are separate operations with no transaction/atomic lock.
**Why it matters:** Two requests from the same user can both pass the check and both proceed — quota is advisory under concurrency.
**Suggested direction:** Use per-user atomic counters (e.g. upsert on a `QuotaWindow` doc incrementing `{ $inc }`, with TTL expiry), or a Mongo transaction where supported.

### [HIGH] Anonymous quota keyed on spoofable client IP

**File:** `lib/audit.ts` (`getClientIp`)
**Issue:** Client IP is taken from the `x-forwarded-for` header (leftmost value) — fully client-controllable.
**Why it matters:** An attacker can forge `x-forwarded-for` to rotate identities and bypass anonymous rate limits, or to poison another user's quota.
**Suggested direction:** Only trust an IP added by a proxy you control (rightmost after trusted proxy count), or key anonymous quota on a signed cookie token instead of IP.
**Source:** OWASP — *IP Spoofing via HTTP Headers* (owasp.org/www-community/pages/attacks/ip_spoofing_via_http_headers); MDN — *X-Forwarded-For header*: "If the server can be directly connected from the internet... no part of the X-Forwarded-For IP list can be considered trustworthy or safe for security-related uses" (developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Forwarded-For).

### [MEDIUM] `/history/merge` route

**File:** `app/api/history/merge/route.ts`
**Issue:** Local-storage history merged into the authenticated user's account. Depending on implementation, a logged-in user's merge could be triggered without strong ownership checks, and merge semantics (dedupe by URL?) may be loose.
**Why it matters:** Potential to overwrite/duplicate server history; also an unauthenticated entry point that should at minimum be session-protected.
**Suggested direction:** Ensure the route requires a session, dedupes by product URL, and never lets a client claim another user's history.

### [MEDIUM] Webhook auth uses a fixed Bearer secret — compare is not constant-time

**File:** `app/api/scrape/webhook/route.ts`
**Issue:** `$WEBHOOK_SECRET` compared against `Authorization: Bearer` value. If compared with `===` (string equality), it's theoretically timing-attackable over a network path.
**Why it matters:** Low practical risk, but webhook verification is a security boundary.
**Suggested direction:** Use `crypto.timingSafeEqual` (hash both sides first to equalize length) for the comparison.

### [LOW] `/scrape/status/[jobId]` marked `no-store`

**File:** `app/api/scrape/status/[jobId]/route.ts`
**Issue:** `no-store` is correct for polling (never cache), so this is fine as-is — noted only to confirm intent.
**Why it matters:** n/a — correctly avoids caching stale job state.
**Suggested direction:** None.

---

## Area 5 — Database

### [MEDIUM] In-memory cache not suitable for serverless multi-instance

**File:** `lib/search/cache.ts`
**Issue:** Search results cached in a module-level `Map` (in-memory). On Vercel/serverless, each warm instance has its own ephemeral memory, so cache hits are inconsistent and the cache resets frequently.
**Why it matters:** Cache is effectively best-effort; hit-rate is low and behavior differs per instance.
**Suggested direction:** Use Vercel Runtime Cache / a shared KV for cross-instance caching, or drop the cache layer and rely on DB indexing.
**Source:** Vercel docs — *Runtime Cache* (vercel.com/docs/caching/runtime-cache): "serverless environments, each instance has its own ephemeral memory with low cache hit rates"; Next.js docs — *`use cache`*: "In serverless environments, memory is not shared between instances" (nextjs.org/docs/app/api-reference/directives/use-cache).

### [MEDIUM] `EmailVerificationToken` TTL cleanup relies on TTL index

**File:** `lib/db/models.ts`
**Issue:** Email-verification tokens use a TTL index with `expireAfterSeconds`. TTL indexes run in the background and only delete on the monitor's sweep — deletions are not immediate.
**Why it matters:** Tokens can outlive their nominal TTL briefly; acceptable, but verification logic should also validate `expiresAt` on read, not trust index timing.
**Suggested direction:** Confirm the TTL index is actually created (unique+expire can't share one index), and check `expiresAt` in the verify handler as defense-in-depth.

### [LOW] Search relevance/scoring logic duplicated between app and scraper-service

**Files:** `lib/search/*` (normalize.ts, score.ts, stopwords.ts) vs `scraper-service/src/search/*` (identical files)
**Issue:** Two copies of the same Arabic normalization + scoring code.
**Why it matters:** Divergence risk — a fix in one tree silently misses the other (already partially divergent: app uses `minRelevance` 0.5 client-side vs 0.3 in scraper-service).
**Suggested direction:** Extract the scoring/normalization module into a shared package consumed by both, or generate one from the other.

---

## Area 6 — Scraper / Puppeteer Best Practices

### [MEDIUM] Jumia `__STORE__` JSON extraction is brittle string-slicing

**File:** `scraper-service/src/scrapers/jumia.ts` (`scrapeViaFetch`)
**Issue:** Finds `window.__STORE__=` then regex-matches `}\s*;\s*<\/script>` to bound the JSON. Minified JS with nested braces or an early `</script>` in a string breaks the slice, and `JSON.parse` failure is caught only loosely.
**Why it matters:** Fragile parse — a Jumia layout change silently returns zero products.
**Suggested direction:** Parse the store via a more robust extractor (e.g. brace-matching, or regex with a full balanced-object scan), and log the parse failure distinctly so breakage is visible.

### [MEDIUM] Noon/Amazon rely on live DOM selectors with no failure telemetry

**Files:** `scraper-service/src/scrapers/noon.ts`, `scraper-service/src/scrapers/amazon.ts`
**Issue:** Selector lists are maintained by hand against live retail sites; on selector drift the scraper logs "no selectors found" and returns empty. Amazon does write a debug screenshot, Noon does not.
**Why it matters:** Silent zero-product failures degrade search quality with no alert.
**Suggested direction:** Emit a structured failure (site name + reason) to the webhook payload so the app can surface "source unavailable" rather than empty results; keep the debug screenshot path for Amazon and add one for Noon/Jumia.

### [LOW] `puppeteer-extra` with stealth plugin but no request throttle

**File:** `scraper-service/src/scrapers/orchestrator.ts` (`applyStealth`)
**Issue:** Stealth evasions (UA, webdriver flags, languages, plugins) are applied, but there's no per-request throttling/jitter beyond Amazon's small `randomDelay`; Amazon also has a retry loop (good).
**Why it matters:** Aggressive parallelism (3 sites via `Promise.all`, per-site 30s cap) is fine, but heavier evasion without pacing can trigger anti-bot more than help.
**Suggested direction:** This is acceptable for a 30s-capped job; consider modest per-site backoff and keep the hard timeout.

### [LOW] Debug screenshot writes to process CWD on filesystem

**File:** `scraper-service/src/scrapers/amazon.ts` (and the pattern in `lib/scrapers/*`)
**Issue:** CAPTCHA/empty-page debug PNGs are written to `process.cwd()`.
**Why it matters:** Works in the CI runner and locally, but on a long-lived server deployment would write into the container FS with no cleanup.
**Suggested direction:** For the CI/Actions flow this is fine; if the Express service is ever redeployed long-lived, write debug artifacts under an env-controlled dir with rotation.

---

## Area 7 — Security

### [CRITICAL] Unrotated broad-scope classic PAT (`repo` scope) for workflow dispatch

**Files:** `.env.local.example`, `scraper-service/README.md`, consumer of `GITHUB_TOKEN` (`lib/github/dispatch.ts`)
**Issue:** The flow requires a **classic** PAT with full `repo` scope (fine-grained PATs are rejected by `POST /repos/{owner}/{repo}/dispatches`). The `.env.local.example` comment and README explicitly note it is **not rotated**, and the docs recommend 90-day expiry — yet the stored secret is a long-lived classic token.
**Why it matters:** A leaked `repo`-scope classic PAT grants write/read access to every repo the owning user can access, including secrets — full repo takeover. This is the single highest-leverage credential in the project. On Vercel it's stored as a project env var, so a compromise reaches CI/secrets.
**Suggested direction:** Rotate immediately to a fresh 90-day (or shorter) classic PAT with only `repo` scope; store as a Vercel project secret, never commit. Document rotation. Strongest alternative: replace with a GitHub App installation token (least privilege), or move dispatch to a token scoped per-repo.
**Source:** GitHub docs — *Repository dispatch* requires an access token; *Managing your personal access tokens* (github.com) — classic tokens with `repo` grant full control of private repositories. README.md itself documents this exact constraint.

### [HIGH] No startup validation that required secrets are set in the main app

**Files:** `.env.local.example`, `app/api/scrape/webhook/route.ts`
**Issue:** The scraper-service asserts `SCRAPER_TOKEN` at startup and fails fast. The main Next.js app does **not** assert `MONGODB_URI`, `NEXTAUTH_SECRET`, `WEBHOOK_SECRET`, `GITHUB_TOKEN` at boot — a misconfigured deploy runs until the first request that needs them fails, and webhook verification silently misbehaves if `WEBHOOK_SECRET` is missing/empty.
**Why it matters:** Misconfiguration surfaces as confusing runtime failures instead of a clear boot error; a missing webhook secret makes the webhook auth a no-op.
**Suggested direction:** Add a startup/env-check module (assert the required vars, bail with a clear message) and fail closed on webhook verification when the secret is unset.

### [MEDIUM] `callbackUrl` from `searchParams` used for post-auth redirect

**File:** `components/AuthForm.tsx`
**Issue:** After login/register the client does `router.push(callbackUrl)` where `callbackUrl` comes from the current URL's search params, unvalidated.
**Why it matters:** Open-redirect style risk — a link like `/login?callbackUrl=https://evil.example` redirects users off-site after auth.
**Suggested direction:** Only allow relative `callbackUrl` values (must start with `/` and not `//`), or resolve it against a server-side allow-list / trusted origin.

### [MEDIUM] `getClientIp` trusts `x-forwarded-for` (see Area 4/High) — quota bypass

**File:** `lib/audit.ts`
**Issue:** Same root cause as the quota finding — IP identity is spoofable, so per-IP rate limits (anon limits 5/hr, 10/day) are trivially bypassed.
**Why it matters:** Abuse of the free anonymous tier and the scrape quota.
**Suggested direction:** Key anonymous limits on a signed cookie/opaque token, or use a trusted-proxy XFF algorithm.

### [MEDIUM] Scrape results cached with a shared global key could leak across users

**File:** `lib/search/cache.ts`
**Issue:** The in-memory Map cache is keyed by query; if it ever grew to cache personalized results it would cross user boundaries. Currently query-only, so no cross-user leak — flagging the pattern for when caching is extended.
**Why it matters:** Future risk if cache keys are widened.
**Suggested direction:** Keep cache keys strictly public-query-scoped; if anything user-specific is cached, namespace by user id.

### [LOW] Dependency hygiene (requested `npm audit`)

**Issue:** Not run in CI for the main app (CI only covers scraper-service). The main app pins `next: latest` — floating, not a pinned version.
**Why it matters:** Known-vulnerability exposure goes unchecked; floating `latest` makes releases non-reproducible.
**Suggested direction:** Pin `next` to a concrete version, add `npm audit` (or `pnpm audit`) to CI for the main workspace, and enable Dependabot/Renovate.

---

## Area 8 — General Bugs

### [HIGH] CI does not lint/typecheck the main Next.js app

**File:** `.github/workflows/ci.yml`
**Issue:** CI only installs + type-checks + tests **scraper-service**. The main app (`app/`, `components/`, `lib/`) is never linted or type-checked in CI (`eslint.config.mjs` ignores `scraper-service/**`, and nothing runs `next lint`/`tsc` for the app).
**Why it matters:** Type errors and lint failures ship silently to production — e.g. the dead `/test` & `/search-test` pages and the broken `/profile` link would have been caught by a type-check/TS config review. High regression risk over time.
**Suggested direction:** Add a CI job running the app's `pnpm lint` + `pnpm typecheck` (already in `package.json` scripts) on push/PR.

### [MEDIUM] Duplicate search/scoring code between app and scraper-service (see Area 5)

**File:** `lib/search/*` vs `scraper-service/src/search/*`
**Issue:** Two copies of normalize/score/stopwords. Already drifting (min-relevance 0.5 vs 0.3).
**Why it matters:** A fix applied in one tree is missed in the other → inconsistent search behavior.
**Suggested direction:** Single shared source of truth (monorepo package or generated copy).

### [MEDIUM] `stopwords.ts` contains duplicate and junk entries

**File:** `scraper-service/src/search/stopwords.ts`
**Issue:** The list has repeated entries (`"，"`, `"جم"`, `"جرام"`, `"قطعة"`, `"سم"`) and a lone `"-"`, plus a duplicated `"،"` line.
**Why it matters:** Harmless functionally (Set-deduped in `normalizeProductName`) but signals the list grew ad hoc; a stray `""` empty string entry is filtered anyway.
**Suggested direction:** Dedupe/clean the list and add a comment on source of the stopwords.

### [MEDIUM] Noon keeps products with empty `url`

**File:** `scraper-service/src/scrapers/noon.ts`
**Issue:** The comment says name+price suffice and pushes products even with `url: ''`.
**Why it matters:** Rows render, but clicking a product with no URL does nothing — a broken link from a search result.
**Suggested direction:** Either require a URL (skip if absent) or have the UI grey-out/hide products without URLs.

### [LOW] `stopwords` includes brand-adjacent words that may over-filter

**File:** `scraper-service/src/search/stopwords.ts`
**Issue:** Words like `led`, `مل`, `كيلو`, `جرام` are stopwords — legitimate for generic queries, but a search like "كابل شاحن" could have meaningful tokens removed if they appear in stopwords.
**Why it matters:** Reduced recall for some queries.
**Suggested direction:** Review stopword list against real product names; keep only high-frequency function words.

### [LOW] `sitemap.ts` / `robots.ts` auth-page noise (see Area 1)

**File:** `app/sitemap.ts`, `app/robots.ts`
**Issue:** Covered above — SEO hygiene.
**Suggested direction:** See Area 1.

### [LOW] `next.config.ts` is minimal

**File:** `next.config.ts`
**Issue:** Only `turbopack: { root: __dirname }` — fine as-is; nothing to fix, noted for completeness.

---

## Files reviewed (full coverage of tracked files)

Config/root: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `components.json`, `.env.local.example`, `.gitignore`.

CI/Workflows: `.github/workflows/ci.yml`, `.github/workflows/scrape.yml`.

Frontend pages: `app/layout.tsx`, `app/page.tsx`, `app/search/layout.tsx`, `app/search/page.tsx`, `app/history/page.tsx`, `app/history/layout.tsx`, `app/login/page.tsx`, `app/register/page.tsx`, `app/search-test/page.tsx`, `app/test/page.tsx`, `app/robots.ts`, `app/sitemap.ts`, `app/manifest.ts`.

Components/hooks: `useScraper.ts`, `useSearchHistory.ts`, `SearchBar.tsx`, `ProductCard.tsx`, `AuthForm.tsx`, `Header.tsx`, `SaveSearchPrompt.tsx`, `Providers.tsx`, `UserMenu.tsx`, `Footer.tsx`, `InputSys.tsx`, `HowItWorksCards.tsx`, `EmptyState.tsx`, `ErrorBanner.tsx`, `SourceBadge.tsx`, `LightRays.tsx`.

API routes: `app/api/auth/[...nextauth]/route.ts`, `app/api/auth/register/route.ts`, `app/api/auth/verify-email/route.ts`, `app/api/history/route.ts`, `app/api/history/merge/route.ts`, `app/api/scrape/route.ts`, `app/api/scrape/status/[jobId]/route.ts`, `app/api/scrape/webhook/route.ts`.

Lib: `lib/db/mongodb.ts`, `lib/db/models.ts`, `lib/quota.ts`, `lib/audit.ts`, `lib/github/dispatch.ts`, `lib/auth/options.ts`, `lib/auth/password.ts`, `lib/email/send.ts`, `lib/payments/paymob.ts`, `lib/search/cache.ts`, `lib/search/normalize.ts`, `lib/search/score.ts`, `lib/search/stopwords.ts`, `lib/products.js`, `lib/types.ts`, `lib/utils.ts`, `lib/scrapers/amazon.ts`, `lib/scrapers/jumia.ts`, `lib/scrapers/noon.ts`, `lib/scrapers/googleShopping.ts`.

Scraper-service: `src/index.ts`, `src/scrape-runner.ts`, `src/scrapers/orchestrator.ts`, `src/scrapers/amazon.ts`, `src/scrapers/jumia.ts`, `src/scrapers/noon.ts`, `src/search/normalize.ts`, `src/search/score.ts`, `src/search/scoring.test.ts`, `src/search/stopwords.ts`, `src/types.ts`, `package.json`, `tsconfig.json`, `Dockerfile`, `README.md`.

---

## Top 5 — if you only fix five things

1. **Rotate the `repo`-scope classic PAT** and move toward a least-privilege token / GitHub App (Critical, Area 7).
2. **Await the scrape-job persistence** in `app/api/scrape/route.ts` so quota is enforced atomically and no job is dropped (Critical, Area 4).
3. **Stop trusting `x-forwarded-for`** for anonymous quota/rate-limit identity — use a trusted-proxy algorithm or a signed cookie key (High, Areas 4 & 7).
4. **Add CI lint + typecheck for the main Next.js app** — currently only scraper-service is checked; this would have caught the dead `/test`, `/search-test` pages and the broken `/profile` link (High, Area 8).
5. **De-duplicate the search/scoring module** between `lib/search/*` and `scraper-service/src/search/*` to stop the 0.5-vs-0.3 relevance drift (Medium/High, Areas 5 & 8).
