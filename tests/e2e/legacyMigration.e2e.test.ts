import { describe, expect, it } from 'vitest';

// Placeholder E2E test illustrating how to exercise the migration runner against a live staging project.
// The test is skipped by default to avoid accidental execution without explicit Supabase credentials.
describe.skip('legacy migration end-to-end (staging Supabase)', () => {
  it('runs the API route and validates Supabase side-effects', async () => {
    expect(true).toBe(true);
    // Suggested flow:
    // 1. Seed the staging database using supabase/seed/20251002121000_portfolio_sample.sql.
    // 2. Hit POST /api/migrations/legacy with staging credentials.
    // 3. Assert that activities/activity_assets are migrated as expected and legacy tables are cleaned up.
    // 4. Verify user_migrations reflects the final status and metrics instrumentation captures the run.
  });
});
