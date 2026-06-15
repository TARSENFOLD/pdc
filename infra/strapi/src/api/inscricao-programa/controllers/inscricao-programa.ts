import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::inscricao-programa.inscricao-programa', ({ strapi }) => ({
  async transitionCompletion(ctx) {
    if (!ctx.state?.auth?.credentials) {
      return ctx.unauthorized('Credencial de serviço obrigatória');
    }
    const inscricaoId = ctx.params.id;
    const action = ctx.request.body?.data?.action;
    const timestamp = ctx.request.body?.data?.timestamp;
    if (!inscricaoId || (action !== 'complete' && action !== 'revert') || typeof timestamp !== 'string') {
      return ctx.badRequest('Transição de conclusão inválida');
    }
    const parsedTimestamp = new Date(timestamp);
    if (Number.isNaN(parsedTimestamp.getTime())) {
      return ctx.badRequest('Timestamp de conclusão inválido');
    }
    const canonicalTimestamp = parsedTimestamp.toISOString();

    const isComplete = action === 'complete';
    try {
      const result = await strapi.db.query('api::inscricao-programa.inscricao-programa').updateMany({
        where: {
          id: inscricaoId,
          concluido: !isComplete,
          ...(isComplete ? {} : { dataConclusao: canonicalTimestamp }),
        },
        data: {
          concluido: isComplete,
          dataConclusao: isComplete ? canonicalTimestamp : null,
        },
      });
      ctx.body = { data: { updated: result.count } };
    } catch (error) {
      strapi.log.error('Falha na transição atómica da conclusão do Programa', {
        error,
        inscricaoId,
        action,
      });
      return ctx.internalServerError('Não foi possível atualizar a conclusão');
    }
  },
}));
