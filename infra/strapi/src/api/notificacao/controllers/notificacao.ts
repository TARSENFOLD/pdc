import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::notificacao.notificacao', ({ strapi }) => ({
  async markAllRead(ctx) {
    const credentials = ctx.state?.auth?.credentials;
    if (!credentials) {
      return ctx.unauthorized('Credencial de serviço obrigatória');
    }
    // Internal BFF boundary: the API token authenticates the service; the BFF
    // derives userId only after validating the end-user JWT.
    const userId = ctx.request.body?.data?.userId;
    if (typeof userId !== 'string' || userId.length === 0) {
      return ctx.badRequest('userId é obrigatório');
    }
    try {
      const perfil = await strapi.db.query('api::perfil.perfil').findOne({
        where: { userId },
        select: ['id'],
      }) as { id: string | number } | null;
      if (!perfil) {
        return ctx.notFound('Perfil não encontrado');
      }
      const timestamp = new Date().toISOString();
      const result = await strapi.db.query('api::notificacao.notificacao').updateMany({
        where: {
          perfil: perfil.id,
          lida: false,
        },
        data: {
          lida: true,
          lidaEm: timestamp,
        },
      });
      ctx.body = { data: { updated: result.count } };
    } catch (error) {
      strapi.log.error('Falha ao marcar notificações como lidas', { error });
      return ctx.internalServerError('Não foi possível atualizar as notificações');
    }
  },
}));
