// Single source of truth for the relevance threshold used to filter
// scored products. Kept in sync with scraper-service/src/search/min-relevance.ts
// by scripts/sync-search.sh and enforced by CI (ci.yml drift-check job).
//
// Value rationale: 0.3 keeps borderline-but-real matches (e.g. brand +
// model variants) and matches the scraper filter. A stricter 0.5 client
// filter silently dropped products the scraper already deemed relevant, so
// both sides now use this one value.
export const MIN_RELEVANCE = 0.3;