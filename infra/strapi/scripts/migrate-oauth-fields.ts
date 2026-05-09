/**
 * Migration: backfill oauthVerified + onboardingCompleto for pre-existing perfis
 *
 * Marks all existing perfis where oauthVerified IS NULL as:
 *   oauthVerified = true
 *   onboardingCompleto = true
 *
 * This is a one-time migration for users who registered before the OAuth
 * onboarding vertical was introduced. After migration, their next Google/LinkedIn
 * login will go directly to /app instead of /criar-conta/finalizar.
 *
 * Usage:
 *   npx tsx infra/strapi/scripts/migrate-oauth-fields.ts
 *   npx tsx infra/strapi/scripts/migrate-oauth-fields.ts --dry-run
 *
 * Idempotent: rows where oauth_verified IS NOT NULL are not touched.
 * DATABASE_URL must point to your Strapi PostgreSQL instance.
 */

import { Client } from 'pg';

const isDryRun = process.argv.includes('--dry-run');

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL env var is required');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const countRes = await client.query<{ count: string }>(
      `SELECT COUNT(*) FROM perfis WHERE oauth_verified IS NULL`
    );
    const total = parseInt(countRes.rows[0]?.count ?? '0', 10);

    console.log(`Perfis with oauth_verified IS NULL: ${total.toString()}`);

    if (isDryRun) {
      console.log('[dry-run] No changes applied.');
      return;
    }

    if (total === 0) {
      console.log('Nothing to migrate.');
      return;
    }

    const updateRes = await client.query(
      `UPDATE perfis
         SET oauth_verified = true,
             onboarding_completo = true,
             updated_at = NOW()
       WHERE oauth_verified IS NULL`
    );

    console.log(`Updated ${(updateRes.rowCount ?? 0).toString()} rows.`);
    console.log('Migration complete.');
  } finally {
    await client.end();
  }
}

main().catch((err: unknown) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
