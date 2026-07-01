# scraper-service

Standalone Puppeteer-based scraper for the **Qarinha** price-comparison app.

This service runs Amazon.eg, Jumia.eg and Noon.com scrapers in a single Node
process, applies the same relevance filter the Next.js API route used to apply
locally, and returns `{ totalScraped, count, products }` over HTTP.

The Next.js app on Vercel calls this service over the network when
`SCRAPER_URL` + `SCRAPER_TOKEN` are configured. Quota checking, MongoDB
history and audit logging stay in the Next.js app — only the actual scraping
is delegated here.

## Endpoints

| Method | Path       | Auth   | Body                  | Response                                       |
| ------ | ---------- | ------ | --------------------- | ---------------------------------------------- |
| GET    | `/health`  | none   | —                     | `{ "ok": true }` (200)                         |
| POST   | `/scrape`  | Bearer | `{ "query": "..." }`  | `{ totalScraped, count, products: Product[] }` |

`Product` is `{ name, price, currency, seller, url, source, image, score, relevance }`.

Query validation: required, trimmed, 1–100 chars.

## Environment variables

| Name            | Required | Default | Description                                              |
| --------------- | -------- | ------- | -------------------------------------------------------- |
| `SCRAPER_TOKEN` | **yes**  | —       | Shared secret. The Next.js app sends it as a Bearer token. |
| `PORT`          | no       | `3001`  | Local port. Render sets `$PORT` automatically.           |

Generate a token with: `openssl rand -hex 32`.

## Run locally

```bash
cd scraper-service
npm install
SCRAPER_TOKEN=devtoken PORT=3001 npm run dev
# or build + start:
npm run build
SCRAPER_TOKEN=devtoken npm start
```

Smoke test:

```bash
curl http://localhost:3001/health
curl -X POST http://localhost:3001/scrape \
  -H "Authorization: Bearer devtoken" \
  -H "Content-Type: application/json" \
  -d '{"query":"iphone 15"}'
```

> Puppeteer downloads its own Chromium on `npm install`. On Windows the dev
> machine uses the `chrome/win64-...` bundle in the parent repo; the Docker
> image (used on Render) installs Debian's system Chromium dependencies and
> lets Puppeteer fetch its own build.

## Deploy to Render (free tier)

1. Push the repo to GitHub (see "GitHub steps" in the project README).
2. In Render dashboard → **New +** → **Web Service**.
3. **Connect repo**: select your `web-scrapper` GitHub repo.
4. **Root directory**: `scraper-service`
5. **Runtime**: `Docker` (Render will pick up the `Dockerfile` automatically).
6. **Instance type**: `Free`.
7. **Environment** → add:
   - `SCRAPER_TOKEN` = a long random string (same one you will put in Vercel)
   - `PORT` is not needed — Render sets it; the app reads `process.env.PORT`.
8. **Health check path**: `/health`.
9. Click **Create Web Service**. The first build pulls the base image, runs
   `npm install`, compiles TypeScript, and starts the server.
10. Copy the Render URL (e.g. `https://qarinha-scraper.onrender.com`).

## Wire the Next.js app to this service

In the **Vercel** project (and locally in `.env.local`):

```
SCRAPER_URL=https://qarinha-scraper.onrender.com
SCRAPER_TOKEN=<the same token you set on Render>
```

`app/api/scrape/route.ts` checks for both env vars; if present it forwards
the request to `${SCRAPER_URL}/scrape` and applies the same Bearer auth,
quota, history and audit logic locally. If either env var is missing it
falls back to running Puppeteer in-process (useful for local dev).

## Notes

- The `--no-sandbox` Chromium flag is required when running as root in the
  Render container. Do not point this service at untrusted input.
- Free Render instances sleep after 15 min of inactivity. The first request
  after sleep can take 30–60 s. If you need always-on, upgrade the plan.
- The Puppeteer system library list in the `Dockerfile` matches Debian
  Bookworm. If you bump the base image, double-check the dep list.
