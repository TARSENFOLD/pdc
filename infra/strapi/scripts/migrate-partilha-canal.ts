import type { Core } from '@strapi/strapi';

interface LegacyShare {
  id: string | number;
  actor?: { id?: string | number } | null;
  targetType?: string | null;
  targetId?: string | null;
}

type CanonicalShare = LegacyShare & {
  actor: { id: string | number };
  targetType: string;
  targetId: string;
};

function toCanonicalShare(share: LegacyShare): CanonicalShare {
  const actorId = share.actor?.id;
  if (actorId === undefined || actorId === null || !share.targetType || !share.targetId) {
    throw new Error(`Partilha ${String(share.id)} sem identidade canónica`);
  }
  return {
    ...share,
    actor: { id: actorId },
    targetType: share.targetType,
    targetId: share.targetId,
  };
}

function shareKey(share: CanonicalShare): string {
  return `${String(share.actor.id)}:${share.targetType}:${share.targetId}`;
}

export async function migratePartilhaCanal(strapi: Core.Strapi): Promise<void> {
  try {
    const legacyShares = await strapi.db.query('api::partilha.partilha').findMany({
      where: { canal: null },
      populate: { actor: true },
      orderBy: { id: 'asc' },
    }) as unknown as LegacyShare[];
    const existingInternalShares = await strapi.db.query('api::partilha.partilha').findMany({
      where: { canal: 'interno' },
      populate: { actor: true },
    }) as unknown as LegacyShare[];

    const canonicalLegacyShares = legacyShares.map(toCanonicalShare);
    const canonicalInternalShares = existingInternalShares.map(toCanonicalShare);

    const seen = new Set<string>();
    const internalKeys = new Set(canonicalInternalShares.map(shareKey));
    const duplicateIds = new Set<string | number>();

    for (const share of canonicalLegacyShares) {
      const key = shareKey(share);
      if (seen.has(key) || internalKeys.has(key)) duplicateIds.add(share.id);
      else seen.add(key);
    }

    await strapi.db.transaction(async () => {
      if (duplicateIds.size > 0) {
        await strapi.db.query('api::partilha.partilha').deleteMany({
          where: { id: { $in: [...duplicateIds] } },
        });
      }

      const result = await strapi.db.query('api::partilha.partilha').updateMany({
        where: { canal: null },
        data: { canal: 'interno' },
      });
      strapi.log.info(
        `[partilha-canal-migration] deduplicated=${String(duplicateIds.size)} updated=${String(result.count)}`,
      );
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    strapi.log.error(`[partilha-canal-migration] failed: ${message}`);
    throw error;
  }
}

export default migratePartilhaCanal;
