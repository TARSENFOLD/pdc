import { factories } from '@strapi/strapi'
import type { Context } from 'koa';

interface MutationResult {
  id: string | number;
  success: boolean;
}

interface AclEntry {
  perfilId: string;
  estado: 'pendente' | 'aprovado' | 'rejeitado';
  solicitadoEm: string;
}

interface SolicitarAcessoResult {
  id: string | number;
  targetId: string | number | null;
}

export default factories.createCoreController('api::projeto.projeto', ({ strapi }) => ({
  async solicitarAcesso(ctx: Context): Promise<MutationResult | Context> {
    const { id } = ctx.params;
    const { perfilId } = ctx.request.body as { perfilId?: string | number };

    if (!perfilId) {
      return ctx.badRequest('perfilId is required');
    }

    try {
      const result = await strapi.db.transaction(async () => {
        const projeto = await strapi.db.query('api::projeto.projeto').findOne({
          where: { documentId: id },
          populate: ['autor'],
        });

        if (!projeto) return null;

        const acl: AclEntry[] = projeto.acessoCoreACL || [];
        if (acl.some((entry) => String(entry.perfilId) === String(perfilId))) {
          return 'exists';
        }

        const newEntry: AclEntry = {
          perfilId: String(perfilId),
          estado: 'pendente',
          solicitadoEm: new Date().toISOString(),
        };

        const updated = await strapi.db.query('api::projeto.projeto').update({
          where: { documentId: id },
          data: { acessoCoreACL: [...acl, newEntry] },
          populate: ['autor'],
        });

        return { 
          id: updated.id, 
          targetId: updated.autor?.documentId ?? updated.autor?.id ?? null 
        } satisfies SolicitarAcessoResult;
      });

      if (result === null) return ctx.notFound('Projeto não encontrado');
      if (result === 'exists') return ctx.badRequest('Pedido já existe ou acesso já concedido');
      
      // G15: O middleware de outbox injetará o eventId no rasto se necessário
      return { 
        id: result.id,
        success: true 
      };
    } catch (err) {
      strapi.log.error('Erro em solicitarAcesso:', err);
      return ctx.throw(500, 'Erro interno ao processar solicitação de acesso');
    }
  }
}));
