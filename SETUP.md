# LocalLoop — Production Setup Guide

This guide walks you through everything you need to make the LocalLoop MVP **production-ready**. By the end of this guide, you'll have a deployed app with real auth, real LLM, real Vercel deploys, real storage, real analytics, and real error tracking.

Estimated time: **2–4 hours** (depends on how many services you've already set up).

---

## Prerequisites

You need accounts on these services (all have free tiers):

| Service | Purpose | Free tier | Sign up |
|---|---|---|---|
| Vercel | Host the Next.js app + deploy target | Hobby (free) | https://vercel.com/signup |
| Neon | Production Postgres DB | Free tier (0.5 GB) | https://neon.tech/signup |
| Google AI Studio | Free Gemini LLM | 1,500 RPD | https://aistudio.google.com/apikey |
| Cloudflare R2 | Site zip storage | 10 GB free | https://dash.cloudflare.com/R2 |
| Upstash Redis | Rate limit + pubsub + BullMQ | 10K cmds/day free | https://console.upstash.com/ |
| Sentry | Error tracking | 5K errors/mo free | https://sentry.io/signup |
| PostHog | Product analytics | 1M events/mo free | https://posthog.com/signup |
| Google Cloud Console | OAuth for sign-in | Free | https://console.cloud.google.com/ |
| Vercel OAuth app | Deploy wizard | Free | https://vercel.com/dashboard/applications/new |

You don't need ALL of these — the app gracefully degrades when any service is missing. But to call it "production", you should have at least the first 5.

---

## Step 1 — Install dependencies

```bash
cd path/to/your/Webshop
npm install
```

The production `package.json` adds these new deps (vs the MVP):

- `next-auth@5` + `@auth/prisma-adapter` — real auth
- `@upstash/ratelimit` + `@upstash/redis` — production rate limiting
- `ioredis` — Redis pub/sub + BullMQ connection
- `bullmq` — production job queue
- `@aws-sdk/client-s3` — Cloudflare R2 (S3-compatible)
- `@sentry/nextjs` — error tracking
- `posthog-node` — analytics
- `stripe` — paid plans (Sprint 5, optional now)

---

## Step 2 — Set up Neon Postgres

1. Go to https://neon.tech/signup and create a free project.
2. Copy the **pooled connection string** (it has `-pooler` in the hostname) — this is your `DATABASE_URL`.
3. Copy the **direct connection string** (no `-pooler`) — this is your `DIRECT_DATABASE_URL`.
4. Create a shadow DB for migrations: `CREATE DATABASE shadow;` and use that for `SHADOW_DATABASE_URL`.

Add to `.env`:

```bash
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/dbname?pgbouncer=true&connection_limit=1"
DIRECT_DATABASE_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname"
SHADOW_DATABASE_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/shadow"
```

Then run migrations:

```bash
npx prisma migrate dev --name init_prod
# This creates all 12 tables (users, accounts, sessions, verification_tokens,
# authenticators, projects, project_steps, services, locations, blog_titles,
# keywords, sites, deployments, openrouter_ledger, spend_caps)
```

Verify:

```bash
npx prisma studio  # opens a GUI — should show all tables
```

---

## Step 3 — Set up Google OAuth (for sign-in)

1. Go to https://console.cloud.google.com/
2. Create a project → APIs & Services → Credentials → Create credentials → OAuth client ID
3. Application type: Web application
4. Authorized JavaScript origins: `http://localhost:3000`, `https://YOUR-DOMAIN.vercel.app`
5. Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`, `https://YOUR-DOMAIN.vercel.app/api/auth/callback/google`
6. Copy the client ID + secret

Add to `.env`:

```bash
AUTH_SECRET="<run: openssl rand -base64 32>"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

For email magic links (optional, requires an SMTP provider like Resend):

```bash
SMTP_HOST="smtp.resend.com"
SMTP_PORT="465"
SMTP_USER="resend"
SMTP_PASS="re_..."
EMAIL_FROM="noreply@yourdomain.com"
```

---

## Step 4 — Set up Gemini (free LLM)

1. Go to https://aistudio.google.com/apikey
2. Create API key → copy it (starts with `AIza...`)

Add to `.env`:

```bash
OPENAI_API_KEY="AIza..."
OPENAI_API_BASE="https://generativelanguage.googleapis.com/v1beta/openai"
```

Verify the key works:

```bash
curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=AIza..." | python3 -c "import sys,json; [print(m['name']) for m in json.load(sys.stdin)['models']]"
```

Pick a current model from the list. As of Oct 2026, `gemini-3.8-flash` is current.

---

## Step 5 — Set up Cloudflare R2 (site storage)

1. Go to https://dash.cloudflare.com/R2
2. Create a bucket named `localloop-sites` (or whatever)
3. Manage R2 → API tokens → Create API token with Object Read & Write
4. Copy account ID, access key ID, secret access key

Add to `.env`:

```bash
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET="localloop-sites"
```

The site-packager uploads the zip to R2 after generation. The download endpoint streams it back via a signed S3 GetObject call.

---

## Step 6 — Set up Upstash Redis (rate limit + pubsub)

1. Go to https://console.upstash.com/
2. Create a Redis DB (global, free tier is 10K commands/day)
3. Copy:
   - REST URL + REST token (for rate limiting)
   - The `rediss://...` connection URL (for BullMQ + pubsub)

Add to `.env`:

```bash
UPSTASH_REDIS_REST_URL="https://...upstash.io"
UPSTASH_REDIS_REST_TOKEN="AXX..."
REDIS_URL="rediss://:AXX...@...upstash.io:6379"
```

The rate limiter uses Upstash REST. The pubsub + worker use `ioredis` via `REDIS_URL`.

---

## Step 7 — Set up Sentry (error tracking)

1. Go to https://sentry.io/signup
2. Create a project → Platform: Next.js
3. Copy the DSN

Add to `.env`:

```bash
SENTRY_DSN="https://...@sentry.io/123"
SENTRY_ORG="your-org"
SENTRY_PROJECT="localloop"
SENTRY_AUTH_TOKEN="sntrys_..."
SENTRY_TRACES_SAMPLE_RATE="0.1"
```

The `instrumentation.ts` file calls `Sentry.init()` on startup. Errors are captured via `captureException()`.

---

## Step 8 — Set up PostHog (analytics)

1. Go to https://posthog.com/signup
2. Create a project → copy the project API key
3. Set the host if EU region: `https://eu.posthog.com`

Add to `.env`:

```bash
POSTHOG_KEY="phc_..."
POSTHOG_HOST="https://app.posthog.com"
```

The analytics wrapper tracks: `signup`, `step-complete`, `generate-start/done/failed`, `deploy-start/done`, `spend-cap-hit`, `preview-open`, `download-zip`, `rate-limit-hit`.

---

## Step 9 — Set up Vercel OAuth (for deploy wizard)

1. Go to https://vercel.com/dashboard/applications/new
2. Create an OAuth app
3. Redirect URI: `https://YOUR-DOMAIN/api/vercel/oauth/callback`
4. Copy client ID + secret

Add to `.env`:

```bash
VERCEL_CLIENT_ID="..."
VERCEL_CLIENT_SECRET="..."
VERCEL_REDIRECT_URI="https://YOUR-DOMAIN/api/vercel/oauth/callback"
VERCEL_API_BASE="https://api.vercel.com"
```

The deploy wizard uses PKCE OAuth. The `vercel.ts` lib implements the full flow: start → callback → token storage (AES-256-GCM) → deploy API call → stream build events.

---

## Step 10 — Set up the encryption key

Generate a 32-byte AES key:

```bash
openssl rand -base64 32
```

Add to `.env`:

```bash
OPENROUTER_ENCRYPTION_KEY="<the base64 string from openssl>"
```

This encrypts the user's OpenRouter + Vercel tokens at rest (AES-256-GCM). Lose this key = lose access to all stored tokens (in production, store it in a secret manager like Doppler or AWS Secrets Manager).

---

## Step 11 — Deploy to Vercel

```bash
# Install Vercel CLI (if not installed)
npm install -g vercel

# Login + link the project
vercel login
vercel link

# Set ALL env vars on Vercel (do each one — Vercel will prompt)
for var in DATABASE_URL DIRECT_DATABASE_URL SHADOW_DATABASE_URL \
           AUTH_SECRET GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET \
           SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS EMAIL_FROM \
           OPENAI_API_KEY OPENAI_API_BASE \
           OPENROUTER_ENCRYPTION_KEY \
           VERCEL_CLIENT_ID VERCEL_CLIENT_SECRET VERCEL_REDIRECT_URI \
           R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_BUCKET \
           UPSTASH_REDIS_REST_URL UPSTASH_REDIS_REST_TOKEN REDIS_URL \
           SENTRY_DSN SENTRY_ORG SENTRY_PROJECT SENTRY_AUTH_TOKEN \
           POSTHOG_KEY POSTHOG_HOST; do
  vercel env add $var
done

# Deploy to preview
vercel

# Verify preview works, then deploy to production
vercel --prod
```

---

## Step 12 — Run the production migration

After the first deploy:

```bash
# Pull the production DATABASE_URL into your shell
export DATABASE_URL="postgresql://...@ep-xxx-pooler.region.aws.neon.tech/..."

# Apply migrations
npx prisma migrate deploy

# Verify
npx prisma studio  # GUI on your local machine, connecting to prod DB
```

---

## Step 13 — Verify the production deployment

```bash
# Set your production URL
export LOCALLOOP_URL=https://your-domain.vercel.app

# Run the smoke test
bash scripts/smoke-test.sh

# Should pass 6 checks:
#   ✓ Health endpoint returns 200
#   ✓ Landing page returns 200
#   ✓ Dashboard returns 200
#   ✓ Sites API returns valid JSON array
#   ✓ OpenRouter key status returns valid JSON
#   (AI suggest is skipped on prod to avoid charges)
```

If all 6 pass, your app is production-ready.

---

## Step 14 — Set up CI (GitHub Actions)

The repo has `.github/workflows/ci.yml` that runs on every PR:

1. `npm ci` — install deps
2. `npx prisma generate` — generate the Prisma client
3. `npm run typecheck`
4. `npm run build`
5. `npm run validate:jsonld` — validates that every generated page has LocalBusiness JSON-LD
6. On AI prompt changes: would run the golden-outputs regression (skipped to avoid LLM charges in CI)

For secrets, set in GitHub repo settings → Settings → Secrets and variables → Actions:

- `OPENAI_API_KEY` — for golden-outputs regression (if you enable it)

---

## Step 15 — Author the 5 golden-output briefs

Per the Sprint Plan D9/D10 deliverable, you need 5 reference briefs that must produce shippable sites. Place in `tests/golden-outputs/`:

```
tests/golden-outputs/
├── cafe-sunday-coffee.json
├── dentist-brightwood.json
├── plumber-pipes-r-us.json
├── lawyer-forma-law.json
└── salon-glow-studio.json
```

Each brief:

```json
{
  "businessName": "Sunday Coffee",
  "niche": "cafe",
  "tone": "friendly",
  "tagline": "Coffee that tastes like Sunday morning.",
  "services": ["Espresso Bar", "Pour-Over Coffee", "Pastries & Baking"],
  "locations": [{ "name": "Williamsburg", "strategy": "neighborhoods" }],
  "blogTitles": ["Why Sunday morning matters"],
  "themeId": "cafe",
  "imageTier": "standard"
}
```

Then run:

```bash
npm run test:golden-outputs
```

This posts each brief to the API, generates the site, downloads the zip, validates JSON-LD, and verifies word counts ≥ 800 per page.

---

## Step 16 — Set up monitoring + alerts

After deploy:

1. **Sentry alerts**: email on `error` events (Sentry → Alerts → New alert)
2. **PostHog dashboards**: weekly trends on `generate-done`, `deploy-done`, `signup`
3. **Uptime monitoring**: synthetic check hitting `/api/health` every 60s
   - Use Checkly, Uptime Robot, or Vercel's built-in monitoring
4. **Neon backups**: verify daily auto-backups in Neon dashboard

---

## Step 17 — Production checklist (final)

Before going live:

- [ ] All env vars set in `.env` AND on Vercel (Step 11)
- [ ] `npx prisma migrate deploy` ran cleanly
- [ ] `vercel --prod` deployed successfully
- [ ] `/api/health` returns 200 with all checks `ok`
- [ ] Smoke test passes (Step 13)
- [ ] Sentry receiving events (visit dashboard, run wizard, check Sentry)
- [ ] PostHog receiving events
- [ ] At least 1 golden-output brief generates successfully
- [ ] JSON-LD validator passes on the generated zip (`npm run validate:jsonld`)
- [ ] Upstash Redis is wired (rate limit + pubsub + worker)
- [ ] CORS configured for the production domain
- [ ] CSP headers allow the Google OAuth popup + Vercel OAuth popup
- [ ] Custom domain configured in Vercel (if not using `*.vercel.app`)
- [ ] DNS records set (A record pointing to Vercel)
- [ ] HTTPS certificate provisioned (Vercel auto-provisions via Let's Encrypt)

---

## What happens if a service is missing

The app gracefully degrades when any production service isn't configured. Here's what happens:

| Service missing | What happens |
|---|---|
| `DATABASE_URL` points to SQLite | Local dev mode — works fine |
| `AUTH_SECRET` not set | Falls back to dev-user (hardcoded `abdul@localloop.dev`) — every API call uses this user |
| `OPENAI_API_KEY` not set | AI suggest calls return canned fallback data; wizard still works |
| `R2_*` not set | Site zips stay on local file system |
| `UPSTASH_REDIS_REST_URL` not set | Rate limiter falls back to in-memory Map |
| `REDIS_URL` not set | Pubsub falls back to in-process EventEmitter; worker uses setTimeout loop |
| `SENTRY_DSN` not set | Errors log to console; no Sentry notifications |
| `POSTHOG_KEY` not set | Analytics events log to console; no PostHog tracking |
| `VERCEL_CLIENT_ID` not set | Deploy wizard uses simulated OAuth + simulated Vercel logs |

The "missing service" fallbacks are clearly marked in each `lib/server/*.ts` file with a `// Falls back to dev stub` comment.

---

## Common production issues

| Issue | Fix |
|---|---|
| Prisma can't connect to Postgres | Check `DATABASE_URL` is the pooled string with `?pgbouncer=true` |
| OpenRouter 401 (insufficient credits) | Switch to Gemini direct (Step 4) OR add $5 to OpenRouter |
| Gemini 404 (model not found) | Run `curl .../v1beta/models?key=...` to see current model IDs; Google deprecates ~every 6 months |
| Vercel OAuth callback 404 | Verify `VERCEL_REDIRECT_URI` matches the registered URI exactly (including https://) |
| SSE stream times out after 30s | Vercel has a 30s idle timeout; the heartbeat (every 25s) keeps it alive |
| Site zip download 404 | Verify R2 bucket permissions + that `uploadSiteZip()` was called after generation |
| JSON-LD validator fails | Run `npm run validate:jsonld` to see which page failed + why |
| Prisma "transaction already started" | Use the direct URL for migrations: `DIRECT_DATABASE_URL` |
| BullMQ worker won't start | Run `npm run worker` in a separate process (don't run inline with the Next.js server) |
| NextAuth "JWT_SECRET is missing" | Set `AUTH_SECRET` (not `JWT_SECRET` — NextAuth v5 renamed it) |

---

## Done — what you have now

After completing all 17 steps, your LocalLoop MVP is:

✅ **Production-ready** — real auth, real LLM, real storage, real rate limiting, real analytics, real error tracking
✅ **Deployable** — running on Vercel with a live URL
✅ **Observable** — Sentry for errors, PostHog for events, `/api/health` for uptime
✅ **Resilient** — multi-provider LLM fallback, AES-encrypted secrets, graceful degradation
✅ **CI/CD** — GitHub Actions runs typecheck + build + JSON-LD validate on every PR
✅ **Migration-ready** — Prisma migrations in version control, deployable via `prisma migrate deploy`

## What's left for v1.0 (future sprints)

Per the Sprint Plan, these are deferred to subsequent 2-week sprints:

- **Sprint 2**: Local SEO Suite (rank tracking, geo-grid, GBP, indexing)
- **Sprint 3**: Growth Tooling (reviews, calls, leads, CRM)
- **Sprint 4**: Insights Engine (rank-change diagnosis + one-click AI fix — flagship differentiator)
- **Sprint 5**: Platform Capabilities (Stripe billing, white-label, REST API, MCP)
- **Sprint 6**: Polish + Vertical Depth (25+ vertical packs, AI governance, AA audit)

The production architecture (auth, storage, analytics, error tracking) supports all of these — no re-architecture needed.
