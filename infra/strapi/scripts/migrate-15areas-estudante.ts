/**
 * Migration: 15 canonical vocational areas + 'estudante' slug
 *
 * Maps legacy enum values to canonical ones:
 *   AGRONOMIA  → CIENCIAS_AGRARIAS
 *   OUTRO      → OUTRA
 *   aluno      → estudante  (perfil.tipo)
 *
 * Affected tables: perfil_vocacionais, programas, projetos, simulacoes,
 *                  experiencias, cursos, mentorias, perfis
 *
 * Usage:
 *   npx tsx infra/strapi/scripts/migrate-15areas-estudante.ts
 *   npx tsx infra/strapi/scripts/migrate-15areas-estudante.ts --rollback
 *   npx tsx infra/strapi/scripts/migrate-15areas-estudante.ts --dry-run
 */

import { Client } from 'pg';

const AREA_MAP: Record<string, string> = {
  AGRONOMIA: 'CIENCIAS_AGRARIAS',
  OUTRO: 'OUTRA',
};

const AREA_MAP_REVERSE: Record<string, string> = {
  CIENCIAS_AGRARIAS: 'AGRONOMIA',
  OUTRA: 'OUTRO',
};

interface TableAreaConfig {
  table: string;
  column: string;
}

const AREA_TABLES: TableAreaConfig[] = [
  { table: 'perfil_vocacionais', column: 'area' },
  { table: 'programas', column: 'area' },
  { table: 'projetos', column: 'area' },
  { table: 'simulacoes', column: 'area' },
  { table: 'experiencias', column: 'area' },
  { table: 'cursos', column: 'area' },
  { table: 'mentorias', column: 'area' },
];

const VALID_IDENTIFIERS = new Set([
  ...AREA_TABLES.map((t) => t.table),
  ...AREA_TABLES.map((t) => t.column),
  'perfis',
  'tipo',
]);

function assertValidIdentifier(id: string) {
  if (!VALID_IDENTIFIERS.has(id)) {
    throw new Error(`Invalid identifier: ${id}`);
  }
}

interface MigrationReport {
  table: string;
  column: string;
  from: string;
  to: string;
  rowsUpdated: number;
}

async function migrateAreas(
  client: Client,
  map: Record<string, string>,
  dryRun: boolean,
): Promise<MigrationReport[]> {
  const reports: MigrationReport[] = [];

  for (const { table, column } of AREA_TABLES) {
    assertValidIdentifier(table);
    assertValidIdentifier(column);
    for (const [from, to] of Object.entries(map)) {
      const countResult = await client.query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM ${table} WHERE ${column} = $1`,
        [from],
      );
      const rowsToUpdate = parseInt(countResult.rows[0]?.count ?? '0', 10);

      if (rowsToUpdate > 0 && !dryRun) {
        await client.query(
          `UPDATE ${table} SET ${column} = $1 WHERE ${column} = $2`,
          [to, from],
        );
      }

      if (rowsToUpdate > 0) {
        reports.push({ table, column, from, to, rowsUpdated: rowsToUpdate });
      }
    }
  }

  return reports;
}

async function migrateTipo(
  client: Client,
  dryRun: boolean,
  rollback = false,
): Promise<MigrationReport[]> {
  const from = rollback ? 'estudante' : 'aluno';
  const to = rollback ? 'aluno' : 'estudante';
  const table = 'perfis';
  const column = 'tipo';
  assertValidIdentifier(table);
  assertValidIdentifier(column);

  const countResult = await client.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM ${table} WHERE ${column} = $1`,
    [from],
  );
  const rowsToUpdate = parseInt(countResult.rows[0]?.count ?? '0', 10);

  if (rowsToUpdate > 0 && !dryRun) {
    await client.query(`UPDATE ${table} SET ${column} = $1 WHERE ${column} = $2`, [to, from]);
  }

  return rowsToUpdate > 0
    ? [{ table, column, from, to, rowsUpdated: rowsToUpdate }]
    : [];
}

async function writeAuditLog(client: Client, reports: MigrationReport[], rollback: boolean) {
  const summary = {
    migration: rollback ? 'rollback-15areas-estudante' : 'migrate-15areas-estudante',
    executedAt: new Date().toISOString(),
    changes: reports,
    totalRowsUpdated: reports.reduce((sum, r) => sum + r.rowsUpdated, 0),
  };

  try {
    await client.query(
      `INSERT INTO audit_logs (action, payload, created_at) VALUES ($1, $2, NOW())`,
      ['migration', JSON.stringify(summary)],
    );
  } catch {
    // audit_logs may not exist in all environments; log to stdout instead
    console.log('[AUDIT]', JSON.stringify(summary, null, 2));
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (process.env.NODE_ENV === "production" && !args.includes("--force")) {
    console.error("🚫 Refusing to run migration in production without --force");
    process.exit(1);
    return;
  }
  const dryRun = args.includes('--dry-run');
  const rollback = args.includes('--rollback');

  const connectionString =
    process.env.DATABASE_URL ??
    `postgresql://${process.env.DATABASE_USERNAME ?? 'strapi'}:${process.env.DATABASE_PASSWORD ?? 'strapi'}@${process.env.DATABASE_HOST ?? 'localhost'}:${process.env.DATABASE_PORT ?? '5432'}/${process.env.DATABASE_NAME ?? 'strapi'}`;

  const client = new Client({ connectionString });
  await client.connect();

  console.log(`\n=== Migration: 15 canonical areas + 'estudante' ===`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : rollback ? 'ROLLBACK' : 'APPLY'}\n`);

  try {
    await client.query('BEGIN');

    const areaMap = rollback ? AREA_MAP_REVERSE : AREA_MAP;
    const areaReports = await migrateAreas(client, areaMap, dryRun);

    const tipoReports = await migrateTipo(client, dryRun, rollback);

    const allReports = [...areaReports, ...tipoReports];

    if (allReports.length === 0) {
      console.log('Nothing to migrate — database is already in canonical state.');
    } else {
      for (const r of allReports) {
        const action = dryRun ? '[DRY-RUN]' : '[UPDATED]';
        console.log(`${action} ${r.table}.${r.column}: "${r.from}" → "${r.to}" (${r.rowsUpdated} rows)`);
      }
      const total = allReports.reduce((sum, r) => sum + r.rowsUpdated, 0);
      console.log(`\nTotal rows updated: ${total}`);
    }

    if (!dryRun) {
      await writeAuditLog(client, allReports, rollback);
      await client.query('COMMIT');
      console.log('\nMigration committed successfully.');
    } else {
      await client.query('ROLLBACK');
      console.log('\nDry run complete — no changes written.');
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed, rolled back:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

void main();
