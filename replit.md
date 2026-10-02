# RecoverLens

RecoverLens is a browser-based rehabilitation and sports movement coach with a live AI mirror, caregiver assistance, and recovery dashboards.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Access provisioning: `RECOVERLENS_CLINICIAN_EMAILS` — comma-separated, deployment-controlled clinician email allowlist. Matching signed-in clinicians are linked to existing patients; other users require one-time invitations.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/recoverlens` — React patient, caregiver, clinician, and coach app
- `artifacts/api-server/src/routes/recovery.ts` — recovery and screening API handlers
- `lib/api-spec/openapi.yaml` — API contract and generated client source
- `lib/db/src/schema/recoverlens.ts` — PostgreSQL tables

## Architecture decisions

- Pose coaching runs as an uninterrupted full-screen mirror experience.
- The mirror requests camera access and retains a reference-grounded demo mode when camera access is unavailable.
- Session records are persisted through the shared API and compared with recent recovery history.

## Product

Patients can run shoulder rehabilitation sessions with live state feedback, caregivers can use a simplified assisted flow, clinicians can review trends and alerts, and coaches can review squat screening flags.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
