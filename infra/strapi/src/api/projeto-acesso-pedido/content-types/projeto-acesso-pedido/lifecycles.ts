type ProjetoAcessoStatus = 'pendente' | 'aprovado' | 'rejeitado';

type UpdateEvent = {
  params: {
    data: Record<string, unknown>;
    where?: { id?: number | string };
  };
};

type CreateEvent = {
  params: {
    data: Record<string, unknown>;
  };
};

function isRespostaStatus(status: unknown): status is Exclude<ProjetoAcessoStatus, 'pendente'> {
  return status === 'aprovado' || status === 'rejeitado';
}

/**
 * Nota de integridade: a restrição de pedido pendente único por (projeto, perfilSolicitante)
 * é aplicada em software neste hook. Strapi v5 não suporta índices únicos condicionais
 * em schema.json; recomenda-se adicionar uma partial unique index em PostgreSQL para
 * produção: CREATE UNIQUE INDEX ... ON projeto_acesso_pedidos (projeto_id, perfil_solicitante_id)
 * WHERE status = 'pendente'.
 */
export default {
  async beforeCreate(event: CreateEvent): Promise<void> {
    const { data } = event.params;
    const projetoId = data.projeto as string | number | undefined;
    const perfilId = data.perfilSolicitante as string | number | undefined;
    if (projetoId !== undefined && perfilId !== undefined) {
      const dup = await strapi.db.query('api::projeto-acesso-pedido.projeto-acesso-pedido').findOne({
        where: { projeto: projetoId, perfilSolicitante: perfilId, status: 'pendente' },
      }) as { id?: string | number } | null;
      if (dup) {
        throw new Error('Já existe um pedido pendente para este projeto.');
      }
    }
    if (isRespostaStatus(data.status)) {
      data.dataResposta = new Date().toISOString();
    }
  },

  async beforeUpdate(event: UpdateEvent): Promise<void> {
    const { data, where } = event.params;
    if (data.status === 'pendente') {
      data.dataResposta = null;
      return;
    }
    if (!isRespostaStatus(data.status)) return;

    const id = where?.id;
    if (id !== undefined) {
      const existing = await strapi.db.query('api::projeto-acesso-pedido.projeto-acesso-pedido').findOne({
        where: { id },
        select: ['status'],
      }) as { status?: ProjetoAcessoStatus } | null;

      if (existing?.status === data.status) return;
    }

    data.dataResposta = new Date().toISOString();
  },
};
