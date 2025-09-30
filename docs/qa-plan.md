# CASfolio QA Strategy (Step 3)

## Automated coverage
- `npm run test` executes unit, integration, contract, and placeholder E2E suites via Vitest.
- `npm run build` ensures the Next.js bundle and TypeScript type checks continue to pass.
- Coverage is generated under `./coverage` (text + lcov) for upload into CI dashboards.

## Manual workflows
1. **Staging sync** – apply Supabase migrations (`supabase/migrations`) and seeds (`supabase/seed`).
2. **Legacy migration dry-run** – enable `ENABLE_LEGACY_MIGRATION=1` and `LEGACY_MIGRATION_DRY_RUN=1`, run `POST /api/migrations/legacy`, confirm:
   - `user_migrations` row transitions to `failed` with `Dry run` message.
   - No records are removed from `casfolio_*` tables.
   - Activities dashboard shows regenerated data during the run and is restored afterwards.
3. **Full migration rehearsal** – disable `LEGACY_MIGRATION_DRY_RUN`, repeat API call, verify new `activities` / `activity_assets` rows, hero headers render, and legacy tables are emptied.
4. **Customization smoke test** – adjust hero content via `/api/customize`, confirm signed URLs resolve on a fresh login session.
5. **Cross-device validation** – log in on desktop + mobile to confirm activities, hero, and custom sections hydrate via Supabase (no stale localStorage data).

## Regression checklist
- Activity CRUD (create/update/delete) returns signed headers and asset URLs.
- API consumers respect RLS (requests with mismatched JWTs return 401/403).
- Legacy migration handles idempotent reruns (`alreadyMigrated=true`).
- Metrics toggle (`ENABLE_USAGE_METRICS`) does not block API handlers when disabled.
- Supabase bucket configuration: hero + activity buckets exist and accept uploads (5 MB limit enforced).

## Sign-off matrix
| Environment | Owner | Checks |
|-------------|-------|--------|
| Local dev   | Engineers | Unit/integration suite, manual smoke |
| Staging     | QA + Engineers | Dry run + full rehearsal, Supabase audit |
| Production  | Release manager | Feature flag flip, metrics validation |
