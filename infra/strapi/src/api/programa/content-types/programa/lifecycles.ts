const REQUIRED_FOR_PUBLISH = ['proposito', 'metodologia', 'cronograma', 'responsavel'] as const;

interface RelationUpdate {
  connect?: Array<{ id: string | number }>;
  disconnect?: Array<{ id: string | number }>;
}

function isRelationUpdatePayload(val: unknown): val is RelationUpdate {
  return !!val && typeof val === 'object' && ('connect' in val || 'disconnect' in val);
}

export default {
  async beforeUpdate(event: { params: { data: Record<string, unknown>; where: { id?: string | number } } }): Promise<void> {
    const { data, where } = event.params;

    // Only validate when publishing (publishedAt being set to a non-null value)
    if (!data.publishedAt) return;

    const id = where?.id;
    if (!id) return;

    // Fetch current record to merge with incoming data
    const current = await strapi.entityService.findOne('api::programa.programa', id, {
      populate: ['responsavel'],
    }) as Record<string, unknown> | null;

    if (!current) return;

    const merged = { ...current, ...data };
    const missing: string[] = [];

    for (const field of REQUIRED_FOR_PUBLISH) {
      const val = merged[field];
      if (field === 'responsavel') {
        // Relation check: for connect/disconnect payload or populated object
        if (isRelationUpdatePayload(val)) {
          const hasNewConnection = val.connect && val.connect.length > 0;
          const isDisconnecting = val.disconnect && val.disconnect.length > 0;

          if (!hasNewConnection && (isDisconnecting || !current[field])) {
            missing.push(field);
          }
        } else if (!val) {
          missing.push(field);
        }
      } else if (val === null || val === undefined || val === '') {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      // Revert to draft instead of publishing
      data.publishedAt = null;
      strapi.log.warn('Programa bloqueado: campos obrigatórios em falta', { missing, programaId: id });
      throw new Error(`Campos obrigatórios em falta para publicar o Programa: ${missing.join(', ')}`);
    }
  },
};
