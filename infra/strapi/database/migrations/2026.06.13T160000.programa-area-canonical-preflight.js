'use strict';

/**
 * Additive enum evolution preflight.
 *
 * Strapi applies the schema allowlist from programa/schema.json. This migration
 * only prevents that evolution from masking incompatible historical rows.
 * It deliberately performs no UPDATE or DELETE.
 */
module.exports = {
  async up(knex) {
    if (knex.client.config.client !== 'pg') return;
    if (!(await knex.schema.hasTable('programas'))) return;

    const result = await knex('programas')
      .whereIn('area', ['AGRONOMIA', 'OUTRO'])
      .count({ total: '*' })
      .first();
    const total = Number(result?.total ?? 0);

    if (total > 0) {
      throw new Error(
        `Programa area migration blocked: ${String(total)} legacy row(s) require an audited data-migration ticket.`,
      );
    }
  },
};
