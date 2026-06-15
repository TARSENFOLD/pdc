import { strapiGet } from '../modules/strapi/strapi.client.js';
import type { StrapiEntityReference } from '../modules/strapi/strapi-entity.js';
import type { InteractionPerfil } from '../modules/interactions/interaction-profile.js';
import { resolvePerfilAvatar } from '../modules/perfil/perfil-media.js';

export interface StrapiMensagem extends StrapiEntityReference {
  conteudo: string;
  lida: boolean;
  remetente: InteractionPerfil;
  destinatario?: InteractionPerfil;
  conversa?: StrapiEntityReference;
  criadoEm?: string;
  createdAt: string;
}

export interface StrapiConversa extends StrapiEntityReference {
  participant1: InteractionPerfil;
  participant2: InteractionPerfil;
  ultimaMensagem?: StrapiMensagem;
  updatedAt: string;
}

export function orderedParticipants(
  first: InteractionPerfil,
  second: InteractionPerfil,
): [InteractionPerfil, InteractionPerfil] {
  return String(first.id).localeCompare(String(second.id), undefined, { numeric: true }) <= 0
    ? [first, second]
    : [second, first];
}

export function isParticipant(conversa: StrapiConversa, userId: string): boolean {
  return conversa.participant1.userId === userId || conversa.participant2.userId === userId;
}

export function otherParticipant(conversa: StrapiConversa, userId: string): InteractionPerfil {
  if (!isParticipant(conversa, userId)) {
    throw new Error(`Utilizador ${userId} não pertence à conversa ${String(conversa.id)}`);
  }
  return conversa.participant1.userId === userId
    ? conversa.participant2
    : conversa.participant1;
}

export function toMensagem(mensagem: StrapiMensagem, conversaId: string) {
  const createdAt = mensagem.criadoEm ?? mensagem.createdAt;
  if (!createdAt) throw new Error(`Mensagem ${String(mensagem.id)} sem timestamp`);
  return {
    id: String(mensagem.id),
    conversaId,
    remetenteId: mensagem.remetente.userId,
    conteudo: mensagem.conteudo,
    lida: mensagem.lida,
    createdAt,
  };
}

export function toConversa(conversa: StrapiConversa, userId: string, naoLidas = 0) {
  const interlocutor = otherParticipant(conversa, userId);
  return {
    id: String(conversa.id),
    interlocutorId: String(interlocutor.id),
    interlocutorNome: interlocutor.nome ?? 'Utilizador PDC',
    interlocutorFoto: resolvePerfilAvatar(interlocutor.avatarUrl, interlocutor.foto) ?? null,
    ultimaMensagem: conversa.ultimaMensagem?.conteudo,
    naoLidas,
    updatedAt: conversa.updatedAt,
  };
}

export async function hasApprovedConnection(
  userId: string,
  destinatarioId: string,
): Promise<boolean> {
  const response = await strapiGet<StrapiEntityReference>('/vinculos', {
    'filters[$or][0][solicitante][userId][$eq]': userId,
    'filters[$or][0][destinatario][userId][$eq]': destinatarioId,
    'filters[$or][1][solicitante][userId][$eq]': destinatarioId,
    'filters[$or][1][destinatario][userId][$eq]': userId,
    'filters[status][$eq]': 'aprovado',
    'pagination[pageSize]': '1',
  });
  return response.data.length > 0;
}
