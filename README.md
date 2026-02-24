# Toth

| | |
|---|---|
| <img src="apps/web/public/toth-logo-original.png" alt="Toth" width="240" /> | **Toth** — Unified search for public available EPUB books. Toth aggregates, normalizes, deduplicates, and indexes content from public and open sources. |

## Requirements

- Node.js >= 20
- PostgreSQL 16, Redis 7, Meilisearch (or use Docker for dependencies)

## Stack

- **Backend**: Node.js, NestJS, PostgreSQL, Redis, Meilisearch
- **Worker**: NestJS (ingestion, normalization, deduplication, search indexing)
- **Frontend**: Next.js, Tailwind CSS

## Quick start (local)

1. Copy `.env.example` to `.env` and set `DATABASE_URL` (and optionally others).
2. Start dependencies: `docker compose up -d postgres redis meilisearch`
3. Run migrations: `npm run migration:run -w api` (from repo root).
4. Start API: `npm run dev:api`
5. Start worker: `npm run dev:worker`
6. Start web: `npm run dev:web`

Then open http://localhost:3000 and use Search. To get results, ensure at least one **source** has a `connector_type` (e.g. `gutenberg`, `standard_ebooks`, `open_library`, `epub_gratis`, `epublibre`, `epubbooks`). Migrations seed some sources; run the worker so ingestion creates works and editions.

## Run with Docker

Full stack (API, worker, web, Postgres, Redis, Meilisearch):

```bash
docker compose up -d
```

API runs migrations on startup. Open http://localhost:3000 (web) and http://localhost:3001 (API).

## Auth and first admin

Users can register and log in to rate works and save them for later. The **Admin** area (ingestion, stats, index) is restricted to users with `role = 'admin'`. To create the first admin, register a normal user via the web app, then set their role in the database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev:api` | Start API (port 3001) |
| `npm run dev:worker` | Start ingestion worker |
| `npm run dev:web` | Start Next.js (port 3000) |
| `npm run dev:all` | Start API, web, and worker (background) |
| `npm run start:api` | Start API (production build) |
| `npm run start:web` | Start web (production build) |
| `npm run start:worker` | Start worker (production build) |
| `npm run start:all` | Start API, web, and worker (production, background) |
| `npm run build` | Build all workspaces |
| `npm run migration:run -w api` | Run DB migrations |
| `npm test -w api` | API tests |
| `npm test -w worker` | Worker tests (includes connector contract tests) |

## API

- `GET /api/health` — Health (database + search)
- `GET /api/home` — Home feed (popular, recent, by subject)
- `GET /api/search?q=...&language=...&license=...` — Search works
- `GET /api/works/:id` — Work detail with editions
- `GET /api/works/:id/ratings` — Ratings (average, count, optional userRating when authenticated)
- `POST /api/works/:id/rate` — Rate work 1–5 (auth, body: `score`)
- `GET /api/authors/:id` — Author detail
- `GET /api/sources` — List sources
- `POST /api/auth/register` — Register (body: `email`, `password`)
- `POST /api/auth/login` — Login (body: `email`, `password`); sets session cookie
- `POST /api/auth/logout` — Logout (auth)
- `GET /api/auth/me` — Current user or null
- `GET /api/me/saved` — Saved works (auth)
- `POST /api/me/saved` — Add saved (auth, body: `work_id`)
- `DELETE /api/me/saved/:workId` — Remove saved (auth)
- `POST /api/takedown` — Takedown request intake (body: `claimant_email`, `reason`, optional `work_id` / `edition_id`)
- Admin routes (`/api/admin/*`) require an authenticated user with `role = 'admin'`

## SLOs and observability

See [docs/slos.md](docs/slos.md). Worker logs structured JSON for ingestion events (`job_start`, `job_complete`, `job_failed`).
