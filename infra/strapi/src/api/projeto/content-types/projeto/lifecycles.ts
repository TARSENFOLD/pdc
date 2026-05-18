export default {
  async beforeUpdate(event: { params: { data: Record<string, unknown>; where: { id?: string | number } } }) {
    const { data, where } = event.params;

    // Only validate when publishing via Strapi native draftAndPublish
    if (!data.publishedAt) return;

    const id = where?.id;
    if (!id) return;

    const current = await strapi.entityService.findOne('api::projeto.projeto', id, {}) as Record<string, unknown> | null;

    if (!current) return;

    const merged = { ...current, ...data };

    const missing: string[] = [];
    if (!merged.titulo || typeof merged.titulo !== 'string' || merged.titulo.trim().length === 0) {
      missing.push('titulo');
    }
    if (!merged.abstract || typeof merged.abstract !== 'string' || merged.abstract.trim().length < 10) {
      missing.push('abstract (mínimo 10 caracteres)');
    }

    if (missing.length > 0) {
      data.publishedAt = null;
      strapi.log.warn('Projeto bloqueado: campos obrigatórios incompletos', { missing, projetoId: id });
      throw new Error(`Campos obrigatórios em falta para publicar o Projeto: ${missing.join(', ')}`);
    }
  },
};
