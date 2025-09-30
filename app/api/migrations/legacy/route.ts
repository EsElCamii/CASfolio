import { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createSupabaseServerClient } from '../../../../lib/supabaseServer';
import { serverEnv } from '../../../../lib/env/server';
import { jsonOk, jsonError, unauthorized, forbidden } from '../../../../lib/api/responses';
import { runLegacyMigration, LegacyMigrationError } from '../../../../lib/migrations/legacy';

export const runtime = 'nodejs';

export async function POST(_request: NextRequest) {
  if (!serverEnv.featureFlags.legacyMigration) {
    return forbidden('Legacy migration is not enabled');
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return unauthorized();
  }

  try {
    const result = await runLegacyMigration(session.user.id);

    for (const tag of result.revalidated ?? []) {
      try {
        revalidateTag(tag);
      } catch (error) {
        console.warn('Failed to revalidate tag', tag, error);
      }
    }

    return jsonOk({
      status: result.status,
      summary: result.summary,
      alreadyMigrated: result.alreadyMigrated,
      revalidated: result.revalidated,
    });
  } catch (error: any) {
    if (error instanceof LegacyMigrationError) {
      return jsonError(
        {
          error: error.message,
          details: error.cause instanceof Error ? error.cause.message : undefined,
        },
        error.message.includes('already migrated') ? 409 : 400
      );
    }
    console.error('Legacy migration crashed', error);
    return jsonError({ error: 'Legacy migration failed', details: String(error?.message ?? error) }, 500);
  }
}
