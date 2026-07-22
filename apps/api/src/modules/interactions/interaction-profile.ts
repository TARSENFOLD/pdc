import { resolvePerfilAvatar } from '../perfil/perfil-media.js';
import { strapiGet } from '../strapi/strapi.client.js';

export interface InteractionPerfil {
  id: string | number;
  documentId?: string;
  userId: string;
  nome?: string;
  avatarUrl?: string | null;
  foto?: { url?: string } | null;
}

export async function getInteractionPerfil(userId: string | null | undefined): Promise<InteractionPerfil | null> {
  if (typeof userId !== 'string' || userId.trim() === '') return null;
  const response = await strapiGet<InteractionPerfil>('/perfis', {
    'filters[userId][$eq]': userId,
    'pagination[pageSize]': '1',
    populate: 'foto',
  });
  return response.data[0] ?? null;
}

export function interactionPerfilId(perfil: InteractionPerfil): string | number {
  return perfil.documentId ?? perfil.id;
}

export function interactionPerfilRelationField(perfil: InteractionPerfil): 'documentId' | 'id' {
  return perfil.documentId ? 'documentId' : 'id';
}

export function interactionPerfilDto(perfil: InteractionPerfil) {
  return {
    id: String(interactionPerfilId(perfil)),
    userId: perfil.userId,
    nome: perfil.nome ?? 'Utilizador PDC',
    avatarUrl: resolvePerfilAvatar(perfil.avatarUrl, perfil.foto),
  };
}
