# RecoverLens project export

This archive contains the current source (including uncommitted changes), all three artifacts, shared libraries, database schema/migrations, assets, screenshots, package lockfile and Replit configuration.

Excluded: secrets/.env files, installed dependencies, build outputs, Git history, private agent/conversation state and platform caches. Hosted PostgreSQL data is NOT included. Database schema is included; a new database will not contain the existing demo patients or history.

## Working elsewhere
- Use a current Node.js LTS release and pnpm. Run `pnpm install` at the project root.
- Supply your own PostgreSQL DATABASE_URL securely. Never commit credentials.
- Apply the schema to your new database using `pnpm --filter @workspace/db run push` (review proposed schema changes first). Populate demo patients as needed.
- Supply a SESSION_SECRET for session-related functionality if required.
- API server example: `PORT=8080 pnpm --filter @workspace/api-server run dev`.
- Web frontend example: `PORT=5173 BASE_PATH=/ pnpm --filter @workspace/recoverlens run dev`.
- Outside Replit, configure your reverse proxy or Vite dev proxy to send /api requests to the API service on port 8080. The exported Vite config relies on Replit's routing; the two commands alone do not configure this proxy.
- `pnpm run typecheck` checks the workspace. Package scripts contain the build commands.
- The optional mockup-sandbox artifact contains design previews, not the main product.

No external-host setup changes were made to the exported source. Check existing configuration for Replit-specific plugins/routing before deploying elsewhere.

Clinical movement targets are demonstration-only and require licensed review before real patient use.
