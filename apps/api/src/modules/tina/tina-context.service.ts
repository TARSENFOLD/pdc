import type { Role } from '@pdc/shared';
import pino from 'pino';
import { strapiGet } from '../strapi/strapi.client.js';
import { aiService } from '../ai/ai.service.js';

const log = pino({ name: 'tina-context-service' });

interface TinaPerfil {
  nome?: string;
  headline?: string;
  instituicao?: { nome?: string };
}

function roleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    estudante: 'Estudante',
    mentor: 'Mentor',
    instituicao: 'Instituição',
    comite_cientifico: 'Comité científico',
    moderador: 'Moderador',
    super_admin: 'Administrador da plataforma',
    patrocinador: 'Patrocinador',
  };
  return labels[role];
}

async function getPerfilContext(userId: string): Promise<string> {
  if (userId.trim() === '') {
    log.warn({ userId }, 'Contexto da Tina solicitado sem userId');
    return '';
  }
  try {
    const response = await strapiGet<TinaPerfil>('/perfis', {
      'filters[userId][$eq]': userId,
      'pagination[pageSize]': '1',
      populate: 'instituicao',
    });
    const perfil = response.data[0];
    if (!perfil) return '';
    return [
      perfil.nome ? `Nome: ${perfil.nome}.` : '',
      perfil.headline ? `Descrição: ${perfil.headline}.` : '',
      perfil.instituicao?.nome ? `Instituição: ${perfil.instituicao.nome}.` : '',
    ].filter(Boolean).join(' ');
  } catch (error) {
    log.warn({ error, userId }, 'Não foi possível carregar o perfil para o contexto da Tina');
    return '';
  }
}

export const tinaContextService = {
  async build(userId: string | null, role?: Role): Promise<string> {
    if (!userId || !role) return 'Utilizador não autenticado.';

    const base = `Papel atual: ${roleLabel(role)}.`;
    const perfil = await getPerfilContext(userId);
    if (role !== 'estudante') {
      return [base, perfil].filter(Boolean).join(' ');
    }

    try {
      const vocacional = await aiService.buildContexto(userId);
      return [base, perfil, vocacional].filter(Boolean).join(' ');
    } catch (error) {
      log.warn({ error, userId }, 'Contexto vocacional indisponível para a Tina');
      return [base, perfil, 'Ainda não há contexto vocacional disponível.']
        .filter(Boolean)
        .join(' ');
    }
  },
};
