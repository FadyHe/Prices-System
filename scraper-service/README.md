# scraper-service

Local Puppeteer scraper module that runs in a **GitHub Actions** runner when the
Next.js app requests a price search.

This directory is no longer deployed as a standalone service. Render / Koyeb /
Back4app all require a credit card even on their free tiers. GitHub Actions
`ubuntu-latest` runners are free, ship with Google Chrome pre-installed, and
play nicely with Puppeteer without a Dockerfile.

## New flow (async job)

```
Browser ──POST──▶  /api/scrape          (Next.js, Vercel)
                      │
                      ├─ quota check / audit log  (unchanged)
                      ├─ create ScrapeJob doc     (status="pending")
                      └─ POST /repos/{owner}/{repo}/dispatches
                              (event_type=run-scrape, client_payload={query,jobId})
                                  │
                                  ▼
                  .github/workflows/scrape.yml  (ubuntu-latest)
                                  │
                                  ├─ npm ci (scraper-service)
                                  ├─ runAllScrapers(query)
                                  │     └─ Amazon.eg, Jumia.eg, Noon.com
                                  └─ POST /api/scrape/webhook
                                          Authorization: Bearer <WEBHOOK_SECRET>
                                          { jobId, products, totalScraped, count }
                                              │
                                              ▼
                                          ScrapeJob updated → status="complete"
Browser ──GET──▶  /api/scrape/status/{jobId}    (polls every 2s, 90s timeout)
```

The frontend never blocks waiting for a Puppeteer run; it submits the job, gets
a `jobId` back, then polls `/api/scrape/status/{jobId}` until the workflow
posts results to `/api/scrape/webhook`.

## Local development

For local dev you can still run the orchestrator directly with ts-node:

```bash
cd scraper-service
npm install
npm run build   # produces dist/
node -e "require('./dist/scrapers/orchestrator').runAllScrapers('iphone 15').then(console.log)"
```

The Next.js dev server falls back to in-process Puppeteer if `GITHUB_TOKEN` /
`GITHUB_REPO` are not set, but in the new architecture the recommended path is
to point at a real GitHub repo and let the workflow handle the run.

## Environment variables (Vercel project)

| Name             | Required | Description                                                                                  |
| ---------------- | -------- | -------------------------------------------------------------------------------------------- |
| `GITHUB_TOKEN`   | **yes**  | Fine-grained PAT used to call the repository_dispatch API. See setup steps below.            |
| `GITHUB_REPO`    | **yes**  | `owner/repo` of the repo that hosts `.github/workflows/scrape.yml`.                          |
| `WEBHOOK_SECRET` | **yes**  | Shared secret. Must match the GitHub repo secret with the same name.                         |

For local dev, copy `.env.local.example` to `.env.local` and fill these in.

## GitHub repo configuration

1. **Add the secret** in your GitHub repo → **Settings → Secrets and variables → Actions**:
   - `WEBHOOK_SECRET` — a long random string, e.g. `openssl rand -hex 32`.
     Must match the `WEBHOOK_SECRET` env var in your Vercel project.
2. **Add the variable** (Settings → Secrets and variables → Actions → Variables tab):
   - `WEBHOOK_URL` — your deployed Vercel URL + `/api/scrape/webhook`,
     e.g. `https://qarinha.vercel.app/api/scrape/webhook`. For local dev use
     a tunnel like ngrok and update the variable.
3. **Create a CLASSIC PAT** used by Vercel to trigger the workflow.

   > **Important — why classic, not fine-grained:** the repository_dispatch
   > endpoint (`POST /repos/{owner}/{repo}/dispatches`) **does not accept
   > fine-grained personal access tokens**. It returns
   > `403 Resource not accessible by personal access token` even if the
   > token has `Actions: Read and write` on the repo. You must use a
   > **classic PAT with the `repo` scope**, OR a GitHub App installation
   > token (more setup; classic PAT is simpler here).
   >
   > If you want to stay closer to least-privilege without going full
   > GitHub App, fine-grained PATs work for every other call in this
   > flow except the dispatch trigger itself.

   Exact steps:

   1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)**.
   2. Click **Generate new token → Generate new token (classic)**.
   3. **Note**: e.g. `qarinha-vercel-dispatch`.
   4. **Expiration**: 90 days (rotate; never "No expiration").
   5. **Scopes**: only check **`repo`** (Full control of private repositories).
      This is the only scope needed for `POST /repos/{owner}/{repo}/dispatches`.
      Leave every other scope unchecked.
   6. Click **Generate token**, copy the value, and paste it as `GITHUB_TOKEN`
      in your Vercel project (and in `.env.local` for local dev).

   The PAT can only act on repositories the owning user can access. It will
   fail (404) on repos you can't see, and a leaked token can be revoked from
   the same settings page.

   **Rotation cadence:** a classic `repo`-scope PAT grants access to *every*
   repo the account can reach, so regenerate it on a **90-day cadence**
   (or sooner). When regenerating: create a new token with a fresh 90-day
   expiry, swap it into Vercel/`.env.local`, verify one real dispatch run
   succeeds, then **revoke the old token immediately**. The 90-day expiry
   makes a forgotten rotation fail loudly rather than silently.

   **Deferred upgrade (highest-leverage hardening):** replace this classic
   PAT with a **GitHub App installation token** scoped to just this repo.
   A classic token is effectively a super-user credential for the account;
   a GitHub App token can be restricted to a single repository and one
   permission. Not done in this pass because it requires creating a GitHub
   App, generating a private key, and swapping the workflow's token source
   — tracked as a follow-up, not silently skipped.

4. **Vercel env vars** (project → Settings → Environment Variables):
   - `GITHUB_TOKEN` = the classic PAT from step 3.
   - `GITHUB_REPO`  = `your-username/your-repo`.
   - `WEBHOOK_SECRET` = the same value as the GitHub repo secret.

## Verifying the flow

1. From the Vercel deployment's shell, or with `curl` against the public URL:
   ```bash
   curl -X POST https://<your-app>.vercel.app/api/scrape \
     -H "Content-Type: application/json" \
     -d '{"query":"iphone 15"}'
   ```
   You should get `{"jobId":"<hex>","status":"pending",...}` back immediately.
2. Watch the GitHub repo → **Actions** tab — a `Scrape (GitHub Actions runner)`
   run should start within a few seconds.
3. Poll the status:
   ```bash
   curl https://<your-app>.vercel.app/api/scrape/status/<jobId>
   ```
4. After ~30–60 s the response flips to `status: "complete"` and includes the
   product list. The webhook from the workflow also posts the same payload to
   `/api/scrape/webhook` with `Authorization: Bearer <WEBHOOK_SECRET>`.

## Notes

- `PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome` is set in the workflow.
  Ubuntu runners ship with Google Chrome pre-installed; we skip the
  ~200 MB Chromium download Puppeteer would otherwise do at install time.
- The workflow's final `curl` step runs in an `if: always()` block, so the
  webhook is notified even if the scraper throws — the job is then marked
  `failed` with an `error` field.
- Free GitHub-hosted runners are limited to ~6 hours per job; the workflow
  uses a 10-minute timeout, which is plenty for Amazon + Jumia + Noon.
- The old `Dockerfile`, `dist/index.js` and `src/index.ts` (Express HTTP
  server) are kept in the tree in case you want to deploy this module as a
  long-lived service elsewhere, but they are no longer the recommended path.
