import type { Core } from '@strapi/strapi';

export async function migratePartilhaCanal(strapi: Core.Strapi): Promise<void> {
  const result = await strapi.db.query('api::partilha.partilha').updateMany({
    where: { canal: null },
    data: { canal: 'interno' },
  });
  strapi.log.info(`[partilha-canal-migration] updated=${String(result.count)}`);
}

export default migratePartilhaCanal;
