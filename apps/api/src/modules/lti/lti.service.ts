import pino from 'pino';
import { strapiGet, strapiPost } from '../strapi/strapi.client.js';
import { type PerfilCompleto } from '@pdc/shared';

const log = pino({ name: 'lti-service' });

export const ltiService = {
  /**
   * Encontra utilizador PDC pelo email fornecido pela plataforma LTI
   */
  async findUserByEmail(email: string): Promise<PerfilCompleto | null> {
    try {
      const res = await strapiGet<PerfilCompleto>('/perfis', {
        'filters[email][$eq]': email,
        'populate': 'role'
      });
      return res.data[0] || null;
    } catch (err) {
      log.error({ err, email }, 'Erro ao procurar utilizador LTI');
      return null;
    }
  },

  /**
   * Cria utilizador PDC base via provisionamento LTI
   */
  async provisionUser(email: string, nome: string): Promise<PerfilCompleto> {
    const res = await strapiPost<PerfilCompleto>('/perfis', {
      email,
      nome,
      role: 'estudante', // Role padrão via LTI
      reputacao: 0,
      xp: 0
    });
    return res.data;
  }
};
