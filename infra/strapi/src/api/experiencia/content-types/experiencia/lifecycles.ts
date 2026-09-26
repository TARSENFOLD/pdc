import { validateExperiencePublication } from './publication-validation';

export default {
  async beforeCreate(event: { params: { data: Record<string, unknown> } }): Promise<void> {
    const { data } = event.params;
    // Invariant: gratuito is always true — block any attempt to set false
    data.gratuito = true;
    validateExperiencePublication(data);
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

    validateExperiencePublication({ ...current, ...data });
  },
};
