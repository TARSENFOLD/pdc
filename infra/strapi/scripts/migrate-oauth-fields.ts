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
  let inTransaction = false;

  try {
    await client.connect();
    await client.query('BEGIN');
    inTransaction = true;

    const countRes = await client.query<{ count: string }>(
      `SELECT COUNT(*) FROM perfis WHERE oauth_verified IS NULL`
    );
    const total = parseInt(countRes.rows[0]?.count ?? '0', 10);

    console.log(`Perfis with oauth_verified IS NULL: ${total.toString()}`);

    if (isDryRun) {
      const sampleRes = await client.query<{ id: number; created_at: Date }>(
        `SELECT id, created_at FROM perfis WHERE oauth_verified IS NULL ORDER BY id LIMIT 5`
      );
      console.log('[dry-run] No changes applied.');
      console.log('[dry-run] Sample affected records:', JSON.stringify(sampleRes.rows, null, 2));
      await client.query('ROLLBACK');
      inTransaction = false;
      return;
    }

    if (total === 0) {
      console.log('Nothing to migrate.');
      await client.query('ROLLBACK');
      inTransaction = false;
      return;
    }

    const updateRes = await client.query(
      `UPDATE perfis
         SET oauth_verified = true,
             onboarding_completo = true,
             updated_at = NOW()
       WHERE oauth_verified IS NULL`
    );
    await client.query('COMMIT');
    inTransaction = false;

    console.log(`Updated ${(updateRes.rowCount ?? 0).toString()} rows.`);
    console.log('Migration complete.');
  } catch (err) {
    if (inTransaction) {
      await client.query('ROLLBACK');
    }
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err: unknown) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
