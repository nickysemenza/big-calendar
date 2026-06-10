# big-calendar

A year-at-a-glance view of your Google Calendar. Sign in with Google and see
every event across all your calendars on one dense, scannable page.

Live at [cal.nickysemenza.com](https://cal.nickysemenza.com).

## Features

- **Three year views**: continuous (every day in reading order), month rows
  (one row per month), and weekends-aligned (whole weeks, so Sat/Sun line up)
- Events from all calendars, color-coded, with multi-calendar duplicates
  merged into striped bars
- Hover any day for a popover of its events; hide individual events or whole
  calendars via URL params (shareable/bookmarkable state)
- Filters for timed events and recurring events; wide mode for big monitors
- Virtual "Company Holidays" calendar computed from US-holiday rules
- Birthday deduplication across calendars

## Stack

Server-rendered JSX, no client framework:

- [Hono](https://hono.dev) + hono/jsx on [Cloudflare Workers](https://workers.cloudflare.com)
- [better-auth](https://better-auth.com) with Google OAuth (calendar read-only scope)
- D1 (SQLite) for sessions/tokens, KV for response caching
- Vite 8, Tailwind 4, TypeScript, Biome, Vitest

## Development

```sh
pnpm install
pnpm dev          # local dev server (needs .dev.vars, see below)
```

Create `.dev.vars` with your own Google OAuth credentials:

```ini
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:5173
```

Checks (same as CI):

```sh
pnpm typecheck
pnpm lint         # biome
pnpm test         # vitest
pnpm build
```

## Deployment

```sh
pnpm cf-typegen   # regenerate worker-configuration.d.ts after wrangler.jsonc changes
pnpm db:migrate   # apply D1 migrations remotely
pnpm deploy       # build + wrangler deploy
```

Secrets (`GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_SECRET`) are stored as
[Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/),
not in the repo.
