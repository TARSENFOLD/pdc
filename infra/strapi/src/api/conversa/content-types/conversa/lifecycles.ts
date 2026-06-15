function participantId(value: unknown): string | undefined {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (!value || typeof value !== 'object') return undefined;
  const relation = value as {
    id?: string | number;
    connect?: Array<{ id?: string | number }>;
  };
  const id = relation.id ?? relation.connect?.[0]?.id;
  return id === undefined ? undefined : String(id);
}

function normalizedParticipantsKey(data: Record<string, unknown>): string {
  const first = participantId(data.participant1);
  const second = participantId(data.participant2);
  if (!first || !second) {
    throw new Error('Não foi possível extrair os participantes da conversa');
  }
  if (first === second) {
    throw new Error('Uma conversa exige dois participantes diferentes');
  }
  return [first, second].sort((left, right) =>
    left.localeCompare(right, undefined, { numeric: true })).join(':');
}

export default {
  beforeCreate(event: { params: { data: Record<string, unknown> } }): void {
    event.params.data.participantsKey = normalizedParticipantsKey(event.params.data);
  },
  async beforeUpdate(event: {
    params: {
      data: Record<string, unknown>;
      where: { id?: string | number };
    };
  }): Promise<void> {
    const id = event.params.where.id;
    if (!id) {
      event.params.data.participantsKey = normalizedParticipantsKey(event.params.data);
      return;
    }
    const current = await strapi.entityService.findOne('api::conversa.conversa', id, {
      populate: ['participant1', 'participant2'],
    }) as Record<string, unknown> | null;
    const merged = { ...(current ?? {}), ...event.params.data };
    event.params.data.participantsKey = normalizedParticipantsKey(merged);
  },
};
