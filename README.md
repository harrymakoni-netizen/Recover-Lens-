# RecoverLens

A browser-based rehabilitation and sports movement coach. It includes a live AI pose mirror, a caregiver-assisted flow, clinician recovery dashboards and coach squat screening.

> Clinical movement targets are demonstration-only and need review by a licensed clinician before use with real patients.

## Quick start

Requirements: Node.js 22+, pnpm 10, and PostgreSQL 14+.

```sh
pnpm install
cp .env.example .env        # then set DATABASE_URL
pnpm db:push                # create tables
pnpm db:seed                # optional demo patients, sessions, alerts
pnpm dev                    # API on :8080, web app on http://localhost:5173
```

The web app proxies `/api` to the API server. Without a login, the API serves a demo user that has every role: patient, caregiver, clinician and coach.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Runs the API server and Vite web app together |
| `pnpm db:push` | Applies the Drizzle schema to `DATABASE_URL` |
| `pnpm db:seed` | Inserts demo data (idempotent) |
| `pnpm typecheck` | Typechecks every package |
| `pnpm build` | Typecheck + production build |
| `pnpm --filter @workspace/api-spec run codegen` | Regenerates the React Query hooks and Zod schemas from `lib/api-spec/openapi.yaml` |

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | required | PostgreSQL connection string |
| `API_PORT` | `8080` | API server port (also the web app's proxy target) |
| `WEB_PORT` | `5173` | Vite dev server port |
| `BASE_PATH` | `/` | Base URL path the web app is served from |
| `RECOVERLENS_CLINICIAN_EMAILS` | — | Comma-separated clinician email allowlist |
| `REPL_ID`, `ISSUER_URL` | — | Only needed for the optional Replit OIDC login |

## Layout

- `artifacts/recoverlens`: React + Vite app with patient, caregiver, clinician and coach pages
- `artifacts/api-server`: Express 5 API, bundled with esbuild
- `artifacts/mockup-sandbox`: design previews (not part of the product)
- `lib/api-spec`: OpenAPI contract; Orval generates `lib/api-client-react` and `lib/api-zod` from it
- `lib/db`: Drizzle schema, migrations and the demo seed (`lib/db/seed.ts`)
- `attached_assets`: reference images and exercise-library source notes

`replit.md` and `EXPORT-README.md` are kept from the original Replit project.
