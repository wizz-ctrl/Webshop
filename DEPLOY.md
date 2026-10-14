# LocalLoop Production Deploy Guide

This guide walks you through deploying the LocalLoop MVP to production.
The MVP runs locally with SQLite + in-memory queue + local file storage;
production swaps each of these for a real service.

## Pre-flight checklist

Before you start:

- [ ] **Vercel account** — for hosting the Next.js app + the deploy-wizard target
- [ ] **OpenRouter account** — for LLM access (optional — Gemini direct works too)
- [ ] **Google AI Studio account** — for free-tier Gemini (recommended for MVP)
- [ ] **Neon Postgres database** (free tier) — for production DB
- [ ] **Cloudflare R2 bucket** — for generated site zips
- [ ] **Upstash Redis** (free tier) — for production rate limiting + pubsub
- [ ] **Sentry account** (free tier) — for error tracking
- [ ] **PostHog account** (free tier) — for analytics
- [ ] **Vercel OAuth app** — register at https://vercel.com/dashboard/applications/new
  - Set redirect URI to `https://YOUR-DOMAIN/api/vercel/oauth/callback`

## 1. Set environment variables

Copy `.env.example` to `.env` and fill in real values:

```bash
cp .env.example .env
# Edit .env with your real values
```

Critical env vars (see `.env.example` for the full list with comments):

| Var | Purpose | Required? |
|---|---|---|
| `DATABASE_URL` | Postgres connection string from Neon | ✅ Yes |
| `OPENAI_API_KEY` | Gemini key from Google AI Studio | ✅ Yes (for AI agents) |
| `OPENAI_API_BASE` | `https://generativelanguage.googleapis.com/v1beta/openai` | ✅ Yes |
| `OPENROUTER_ENCRYPTION_KEY` | 32-byte base64 AES key for encrypting user OpenRouter keys | ✅ Yes |
| `VERCEL_CLIENT_ID` | Vercel OAuth app client ID | ✅ Yes (for deploy wizard) |
| `VERCEL_CLIENT_SECRET` | Vercel OAuth app client secret | ✅ Yes (for deploy wizard) |
| `VERCEL_REDIRECT_URI` | `https://YOUR-DOMAIN/api/vercel/oauth/callback` | ✅ Yes |
| `SENTRY_DSN` | Sentry project DSN | Optional (errors → console.log if unset) |
| `POSTHOG_KEY` | PostHog project key | Optional (events → console.log if unset) |
| `SITES_DIR` | Path or R2 bucket prefix for site zips | Optional (defaults to `.data/sites`) |

## 2. Initialize the production database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations against the production Postgres DB
npx prisma migrate deploy

# Verify connectivity
npx prisma studio  # opens a GUI — should show your DB tables
```

## 3. Swap dev stubs for production services

The MVP has 5 stub modules that need to be swapped for production. Each
file has a clear "Handoff" comment at the top with the production
replacement instructions:

| Stub file | Production swap |
|---|---|
| `src/lib/server/db.ts` | Already uses `DATABASE_URL` env — just set it to Postgres |
| `src/lib/server/rate-limit.ts` | Swap in-memory Map for Upstash Redis (`@upstash/ratelimit`) |
| `src/lib/server/pubsub.ts` | Swap EventEmitter for Redis pub/sub (`ioredis`) |
| `src/lib/server/worker.ts` | Swap `setTimeout` loop for BullMQ (`bullmq`) + separate worker process |
| `src/lib/server/site-packager.ts` | Swap local file system for Cloudflare R2 (`@aws-sdk/client-s3` or `wrangler`) |
| `src/lib/server/deploy-worker.ts` | Swap simulated Vercel logs for real Vercel REST API calls |
| `src/lib/server/sentry.ts` | Install `@sentry/node`, call `Sentry.init({ dsn })` |
| `src/lib/server/analytics.ts` | Install `posthog-node`, call `client.capture()` |

## 4. Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login + link the project
vercel login
vercel link

# Set environment variables (run for each var)
vercel env add DATABASE_URL
vercel env add OPENAI_API_KEY
vercel env add OPENAI_API_BASE
vercel env add OPENROUTER_ENCRYPTION_KEY
vercel env add VERCEL_CLIENT_ID
vercel env add VERCEL_CLIENT_SECRET
vercel env add VERCEL_REDIRECT_URI
vercel env add SENTRY_DSN
vercel env add POSTHOG_KEY
# Paste each value when prompted

# Deploy to preview
vercel

# Once verified, deploy to production
vercel --prod
```

## 5. Verify the production deployment

Run the smoke test script:

```bash
# Set the production URL
export LOCALLOOP_URL=https://your-domain.vercel.app

# Run the smoke test
bash scripts/smoke-test.sh
```

The smoke test verifies:
- Health check (`/api/health`) returns 200 with `status: "ok"`
- Landing page renders
- Dashboard loads with 0 sites
- AI suggest-services returns real LLM output (not canned)
- Create-site + generate flow produces a real zip
- Site preview contains LocalBusiness JSON-LD
- JSON-LD validator passes on the generated pages

## 6. PostHog + Sentry verification

After deploy:

1. Visit https://your-domain.vercel.app/dashboard
2. Run the wizard through Step 8
3. Check Sentry: should see no errors (only breadcrumbs in dev)
4. Check PostHog: should see events for `signup`, `step-complete`, `generate-done`

## 7. CI setup (GitHub Actions)

The repo has a `.github/workflows/ci.yml` (create if not present) that:

- Runs `npm run typecheck` on every PR
- Runs `npm run build` on every PR
- Runs `npm run validate:jsonld` against the 5 golden-output briefs (per Sprint Plan D9)
- Blocks merges on regression

Example CI workflow:

```yaml
name: CI
on: [pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx prisma generate
      - run: npm run typecheck
      - run: npm run build
      - run: npm run validate:jsonld
        env:
          DATABASE_URL: 'file:./.data/ci-test.db'
```

## 8. Production DB migrations

When you change `prisma/schema.prisma`:

```bash
# Create a migration
npx prisma migrate dev --name my-migration

# Apply to production
npx prisma migrate deploy
```

Never use `prisma db push --force-reset` in production — it drops all data.

## 9. Monitoring + alerts

After deploy, set up:

- **Sentry alerts**: email on `error` events
- **PostHog dashboards**: track `generate-done`, `deploy-done`, `signup` weekly trends
- **Uptime monitoring**: synthetic check hitting `/api/health` every 60s
  - Use Checkly, Uptime Robot, or Vercel's built-in monitoring
- **DB backups**: Neon auto-backs up daily on free tier; verify in dashboard

## 10. The 5 golden-output briefs (Taimoor's regression set)

Per Sprint Plan D9/D10, the regression set is 5 reference briefs that
must produce shippable sites. Store them in `tests/golden-outputs/`:

```
tests/golden-outputs/
├── cafe-sunday-coffee.json         # Café in Brooklyn
├── dentist-brightwood.json        # Dentist in Austin
├── plumber-pipes-r-us.json        # Plumber in Lahore
├── lawyer-forma-law.json          # Law firm in NYC
└── salon-glow-studio.json         # Salon in SF
```

Each brief contains: `businessName`, `niche`, `tone`, `services[]`,
`locations[]`, `blogTitles[]`, `themeId`, `imageTier`. Run them via:

```bash
npm run test:golden-outputs
```

This:
1. Posts each brief to `/api/sites` + `/api/sites/[id]/generate`
2. Waits for the `done` SSE event
3. Downloads the zip
4. Runs `npm run validate:jsonld` against the unzipped HTML
5. Verifies word counts ≥ 800 per page
6. Verifies internal links resolve to real pages in the zip
7. Blocks the build if any check fails

## 11. Rollback

If a deploy goes wrong:

```bash
# Roll back to the previous Vercel deployment
vercel rollback

# Or roll back the DB migration
npx prisma migrate resolve --rolled-back <migration_name>
```

## 12. Production checklist (final)

Before going live:

- [ ] `.env` has all required vars (see section 1)
- [ ] `npx prisma migrate deploy` ran cleanly
- [ ] `vercel --prod` deployed successfully
- [ ] `/api/health` returns 200 with all checks `ok`
- [ ] Smoke test passes
- [ ] Sentry receiving events
- [ ] PostHog receiving events
- [ ] At least 1 golden-output brief generates successfully
- [ ] JSON-LD validator passes on the generated zip
- [ ] Rate limit (Upstash Redis) is wired
- [ ] CORS is configured for the production domain
- [ ] CSP headers allow the Vercel OAuth popup

## 13. Common production issues

| Issue | Fix |
|---|---|
| Prisma can't connect to Postgres | Check `DATABASE_URL` is the pooled connection string (`?pgbouncer=true`) |
| OpenRouter 401 | Verify `OPENROUTER_API_KEY` is set + the account has credits |
| Gemini 404 on model name | Run `curl https://generativelanguage.googleapis.com/v1beta/models?key=...` to see current model IDs |
| Vercel OAuth callback 404 | Verify `VERCEL_REDIRECT_URI` matches the registered URI exactly |
| SSE stream times out after 30s | Vercel has a 30s idle timeout — the heartbeat (every 25s) keeps it alive |
| Site zip download 404 | Verify R2 bucket permissions — the `getZipPath()` returns the right key |
| JSON-LD validator fails | Run `npm run validate:jsonld` locally to see which page failed + why |

---

For local dev setup, see the main README.md.
