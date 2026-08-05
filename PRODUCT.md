# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Product Purpose
قارنها (Qarinha) — an Egyptian price-comparison search engine. Given any product query, it scrapes live listings from Amazon.eg, Noon, and Jumia, normalizes Arabic product names, scores relevance, and returns every offer ranked cheapest-first so the shopper can see the lowest price across stores in a single search. Success = the shopper finds and acts on the best offer quickly, without opening several tabs and comparing manually.

## Users
Primary users are everyday Egyptian shoppers comparing prices before buying on local e-commerce sites, looking to save money. They are price-sensitive; trust and a clearly-ranked lowest price matter more than brand spectacle.

## Positioning
The product makes "lowest price across Egypt's major online stores" reachable in one Arabic search. Its truthful differentiators are (1) live cross-store coverage of Amazon.eg / Noon / Jumia ranked cheapest-first, and (2) Arabic normalization plus relevance scoring that filters out irrelevant results. Keep marketing copy honest: do not over-claim that it beats every deal everywhere; "compare in one search, in seconds" is the defensible claim.

## Operating Context
Arabic-first, RTL interface, running on a Next.js App Router stack. Store brand colors (Amazon/Noon/Jumia) are a visual part of the result surface. Scraping has rate limits per user and per day; a user sitting at a quota wall is a real operating scene.

## Capabilities and Constraints
- Scrapes Amazon.eg, Noon, and Jumia; Google Shopping is described as a "placeholder" scraper — treat any Google claims as unconfirmed until implemented.
- Auth: Google OAuth (on by default when creds configured) + email/password credentials; JWT sessions, 30-day max.
- Visual is dark, glassy, purple/blue gradient with a WebGL light-ray background across the site.
- Quota tiers by plan — free: 10/hr, 5/day; pro: 60/hr, 50/day; premium: 200/hr, 200/day. Anonymous IP-based limits also exist.
- Arabic and Western numerals both parsed in prices.

## Capabilities, Constraints — Undecided
- Monetization: free/pro/premium tiers and a Paymob customer ID field exist in the data model, but **no pricing/plans page exists in the UI yet and upgrade flow is not built.** Free/pro/premium are therefore "plans are real, page pending," not an implemented commerce surface. Do not fabricate prices, feature grids, or a working checkout.

## Brand Commitments
- Product name: قارنها (Qarinha). Internal package name is `web-scrapper`.
- Voice is warm, casually Egyptian Arabic (informal "try these", "save your money" tone) with an RTL layout.
- Dark glass aesthetic with purple→blue gradient accents and light rays is the current visual identity.

## Evidence on Hand
- README.md is a comprehensive engineering walkthrough (scraping flow, async GitHub Actions job pattern, models, auth, quota, audit logging).
- Repo hygiene over-claims: README states the whole codebase was "built from zero without template," and application metadata ("built with Ogl", open-graph image) may be overstated — verify before repeating as product truth.
- Real scope: 3 confirmed live sources (Amazon.eg, Noon, Jumia); Google Shopping placeholder; ~12K products compared and ~30s average search are marketing stats, not independently verified.

## Product Principles
- Serve the money-saving job first: cheapest-first ranking, clear prices, low cognitive friction.
- Preserve truth: never over-claim coverage, guarantees, or statistics in copy.
- Respect the quota scene: users hitting limits should be guided, not confused.
- Keep the Arabic-first RTL reading experience coherent across every surface.
- Display evidence honestly: availability/counts should reflect what the scrapers actually return.

## Accessibility & Inclusion
- RTL Arabic-first UI; Islamic world numerals across the region require careful handling. No specific WCAG conformance level was established in the repo.