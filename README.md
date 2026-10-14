# webshop — LocalLoop MVP (Complete Merge)

AI website generator with local SEO tracking. Next.js 15 + Prisma 6 + Gemini.

## Quick start

```bash
npm install
npx prisma generate
npx prisma db push
unset DATABASE_URL  # clear stale shell env
npm run dev
```

Open http://localhost:3000/dashboard

## Setup

1. Get a free Gemini API key at https://aistudio.google.com/apikey
2. Paste it into .env: OPENAI_API_KEY="AIza..."
3. Restart npm run dev (env vars load at startup only)
4. Go to /dashboard/settings → save any key starting with sk-or- (the fake key triggers fallback to Gemini)
5. Go to /dashboard/create → run the 8-step wizard

See SETUP.md for production deployment guide.
