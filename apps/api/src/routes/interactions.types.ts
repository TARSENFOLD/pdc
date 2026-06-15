import type { Bookmark, InteractionTargetType } from '@pdc/shared';
import type { InteractionPerfil } from '../modules/interactions/interaction-profile.js';

export interface StrapiInteractionEntity {
  id: number;
  documentId?: string;
  targetType: InteractionTargetType;
  targetId: string;
  criadoEm?: string;
  createdAt?: string;
}

export interface StrapiShare extends StrapiInteractionEntity {
  canal: 'interno' | 'whatsapp' | 'linkedin' | 'twitter' | 'email' | 'outro';
  nota?: string;
}

export function toBookmark(
  entity: StrapiInteractionEntity,
  perfil: InteractionPerfil,
): Bookmark {
  const createdAt = entity.criadoEm ?? entity.createdAt;
  if (!createdAt) throw new Error(`Bookmark ${String(entity.id)} sem timestamp`);
  return {
    id: String(entity.id),
    userId: perfil.userId,
    targetType: entity.targetType,
    targetId: entity.targetId,
    createdAt,
  };
}
