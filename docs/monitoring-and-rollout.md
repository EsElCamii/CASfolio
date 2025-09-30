# Monitoring, Release, and Ops Plan (Step 3)

## Feature flags & environments
- `ENABLE_LEGACY_MIGRATION`: master switch for the migration runner.
- `LEGACY_MIGRATION_DRY_RUN`: when set to `1`, the runner performs the full workload, rolls back inserted data, and leaves migration log status as `failed (Dry run complete)` so it can be rerun.
- `ENABLE_USAGE_METRICS`: toggles telemetry emission to the configured metrics endpoint without impacting runtime behaviour.

Recommended rollout:
1. **Staging dry run**
   - Enable both `ENABLE_LEGACY_MIGRATION=1` and `LEGACY_MIGRATION_DRY_RUN=1`.
   - Seed staging with `supabase/seed/20251002121000_portfolio_sample.sql` and execute `POST /api/migrations/legacy` while authenticated.
   - Review the response (`dryRun: true`) and Supabase tables to ensure legacy data remains untouched.
2. **Staging production parity run**
   - Flip `LEGACY_MIGRATION_DRY_RUN=0` and rerun the endpoint.
   - Verify `user_migrations` shows `status=completed`, new rows exist in `activities` + `activity_assets`, and `casfolio_*` tables are empty.
3. **Production launch**
   - Gate the API behind `ENABLE_LEGACY_MIGRATION=0` until rollout day.
   - Promote the staging-tested seeds/migrations, enable the flag, and monitor metrics.

## Metrics & observability
Environment variables:
- `ENABLE_USAGE_METRICS` – enables the internal metrics emitter.
- `METRICS_SOURCE` – identifier for dashboards (default `casfolio-web`).
- `METRICS_SAMPLE_RATE` – integer (1-100) controlling sampling percentage.
- `METRICS_WEBHOOK_URL` – optional HTTP endpoint (Honeycomb, New Relic, etc.).

Suggested signals:
- Count of successful vs. failed migration runs (tagged by user_id, dryRun flag).
- Duration of migration phases (preflight, uploads, purge) sampled via structured logs.
- Storage errors/latency from Supabase Storage client (upload/remove retries).

## Rollback plan
- Revert feature flag `ENABLE_LEGACY_MIGRATION=0` to block the API.
- Restore backups or reseed legacy tables using Supabase PITR if data loss discovered.
- Re-run migration with dry run to test fixes before reenabling full run.

## Operational runbook
- **Seeding**: `supabase db push` followed by applying files in `supabase/seed` for deterministic QA data.
- **Testing**: `npm run test` locally, CI must also run `npm run build`.
- **Monitoring**: connect `METRICS_WEBHOOK_URL` to your logging platform, create alerts for `status=failed` events in `user_migrations`.
- **Post-deploy**: confirm hero images render cross-device, and `activity_assets` policies prevent cross-user access via Supabase dashboard.
