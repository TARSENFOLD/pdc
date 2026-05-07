export default {
  async beforeUpdate(event: { params: { data: Record<string, unknown>; where: { id?: string | number } } }) {
    const { data, where } = event.params;

    // Only validate when publishing
    if (!data.publishedAt) return;

    const id = where?.id;
    if (!id) return;

    const current = await strapi.entityService.findOne('api::projeto.projeto', id, {}) as Record<string, unknown> | null;

    if (!current) return;

    const merged = { ...current, ...data };
    const abstractLayer = (merged.abstract ?? {}) as Record<string, unknown>;

    const missing: string[] = [];
    if (!abstractLayer.titulo) missing.push('abstract.titulo');
    if (!abstractLayer.problema) missing.push('abstract.problema');

    if (missing.length > 0) {
      data.publishedAt = null;
      strapi.log.warn('Projeto bloqueado: camadas abstract incompletas', { missing, projetoId: id });
      throw new Error(`Campos obrigatórios em falta para publicar o Projeto: ${missing.join(', ')}`);
    }
  },
};
