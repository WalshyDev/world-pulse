# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

World Pulse is a daily voting app where users answer one global question per day. Built on Cloudflare Workers with a React frontend.

**Production URLs:**
- Main app: https://worldpulse.quickbyte.games
- Admin panel: https://worldpulse-admin.quickbyte.games (protected by Cloudflare Access)

## Commands

```bash
# Development
pnpm dev              # Start all apps (turbo)
pnpm --filter api dev # Start API only (port 8787)
pnpm --filter web dev # Start web only (port 5173)
pnpm --filter admin dev # Start admin (port 8788, shares API's D1 state)

# Build & Deploy
pnpm build            # Build all apps
pnpm deploy           # Deploy all to Cloudflare

# Linting & Types
pnpm lint             # Lint all packages
pnpm lint:fix         # Lint with auto-fix
pnpm typecheck        # Type check all packages

# Database
pnpm db:migrate       # Apply migrations locally
pnpm --filter api db:migrate:prod  # Apply migrations to production
pnpm db:generate      # Generate Drizzle migrations from schema
```

**Deploy with specific account (required for admin):**
```bash
CLOUDFLARE_ACCOUNT_ID=4e599df4216133509abaac54b109a647 npx wrangler deploy
```

## Architecture

### Monorepo Structure

- `apps/api` - Cloudflare Worker with Hono, serves both API and web frontend
- `apps/web` - React frontend (Vite + Tailwind), built assets served by API worker
- `apps/admin` - Separate Cloudflare Worker with React admin panel, protected by Cloudflare Access
- `packages/shared` - Shared types and constants (imported as `@world-pulse/shared`)

### Cloudflare Bindings (API)

| Binding | Type | Purpose |
|---------|------|---------|
| `DB` | D1 | SQLite database (shared with admin) |
| `CACHE` | KV | Response caching with TTLs |
| `SHARE_CARDS` | R2 | Generated SVG share images |
| `AI` | Workers AI | Content moderation |
| `VOTE_AGGREGATOR` | Durable Object | Real-time vote aggregation with WebSocket |
| `COUNTRY_VOTES` | Durable Object | Per-country vote tracking |
| `ANALYTICS` | Analytics Engine | Usage analytics |

### Store Pattern

Database access uses singleton stores that get the D1 binding from `cloudflare:workers`:

```typescript
import { env } from 'cloudflare:workers';
class _QuestionsStore {
  private get db() {
    return drizzle((env as Env).DB);
  }
  // methods...
}
export const QuestionsStore = new _QuestionsStore();
```

Stores are in `apps/api/src/db/stores/` and `apps/admin/src/db/stores/`.

### API Routes

API routes use Hono and are mounted in `apps/api/src/index.ts`:
- `/api/question` - Current question, history
- `/api/vote` - Cast votes
- `/api/user` - User stats, achievements
- `/api/queue` - Question submissions
- `/api/share` - SVG share cards, Open Graph pages
- `/api/ws` - WebSocket for real-time vote updates

### Admin Authentication

Admin routes use Cloudflare Access JWT validation (`apps/admin/src/middleware/access.ts`). The middleware validates JWTs from `walshy.cloudflareaccess.com`.

### Scheduled Tasks

A cron trigger runs daily at midnight UTC (`0 0 * * *`) to rotate questions via `apps/api/src/lib/scheduled.ts`.

### Frontend State

The web app uses React Context for shared state:
- `UserStatsContext` - User stats/achievements with refetch capability

## Database Schema

Tables defined in `apps/api/src/db/schema.ts`:
- `questions` - Daily questions with options (JSON), status (pending/active/archived)
- `votes` - Vote records with IP-based deduplication
- `question_submissions` - User-submitted questions for queue
- `achievements` - Unlocked achievements per IP
- `banned_ips` - IP bans (managed via admin)

Migrations in `apps/api/migrations/`. Both API and admin workers share the same D1 database.

## Code Style

ESLint enforces: single quotes, semicolons, 2-space indent, 120 char line limit, trailing commas.
