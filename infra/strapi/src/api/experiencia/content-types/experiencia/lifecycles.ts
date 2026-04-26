const MURAL_MIN_VIDEOS = 3;

export default {
  async beforeCreate(event: { params: { data: Record<string, unknown> } }): Promise<void> {
    const { data } = event.params;
    // Invariant: gratuito is always true — block any attempt to set false
    data.gratuito = true;
  },

  async beforeUpdate(event: { params: { data: Record<string, unknown>; where: { id?: string | number } } }): Promise<void> {
    const { data, where } = event.params;

    // Lock gratuito
    if ('gratuito' in data) {
      data.gratuito = true;
    }

    // Only validate when transitioning to review/published
    const targetEstado = typeof data.estado === 'string' ? data.estado : undefined;
    const isPublishing = !!data.publishedAt;
    if (targetEstado !== 'review' && targetEstado !== 'approved' && targetEstado !== 'published' && !isPublishing) {
      return;
    }

    const id = where?.id;
    if (!id) return;

    const currentEntity = await strapi.entityService.findOne('api::experiencia.experiencia', id);
    const current = typeof currentEntity === 'object' && currentEntity !== null ? currentEntity : null;
    if (!current) return;

    const merged = { ...current, ...data };
    const missing: string[] = [];

    if (!merged.painelRealidade) {
      missing.push('painelRealidade');
    }

    const mural = Array.isArray(merged.muralVozes) ? merged.muralVozes : undefined;
    if (!mural || mural.length < MURAL_MIN_VIDEOS) {
      missing.push(`muralVozes (mínimo ${MURAL_MIN_VIDEOS} depoimentos)`);
    }

    if (!merged.guiaInstitucional) {
      missing.push('guiaInstitucional');
    }

    if (missing.length > 0) {
      throw new Error(`Experiência bloqueada: painéis obrigatórios em falta: ${missing.join(', ')}`);
    }
  },
};
