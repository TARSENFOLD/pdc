export function participantId(value: unknown): string | undefined {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (!value || typeof value !== 'object') return undefined;
  const relation = value as {
    id?: string | number;
    connect?: Array<{ id?: string | number }>;
  };
  if (relation.connect && relation.connect.length > 1) {
    throw new Error('Uma conversa aceita apenas um participante por relação');
  }
  const id = relation.id ?? relation.connect?.[0]?.id;
  return id === undefined ? undefined : String(id);
}

export function normalizedParticipantsKey(data: Record<string, unknown>): string {
  const first = participantId(data.participant1);
  const second = participantId(data.participant2);
  if (!first || !second) {
    throw new Error('Não foi possível extrair os participantes da conversa');
  }
  if (first === second) {
    throw new Error('Uma conversa exige dois participantes diferentes');
  }
  return [first, second].sort(compareParticipantIds).join(':');
}

function compareParticipantIds(first: string, second: string): number {
  if (/^\d+$/.test(first) && /^\d+$/.test(second)) {
    const leftNumber = BigInt(first);
    const rightNumber = BigInt(second);
    return leftNumber === rightNumber ? 0 : leftNumber < rightNumber ? -1 : 1;
  }
  return first < second ? -1 : first > second ? 1 : 0;
}

export default {
  beforeCreate(event: { params: { data: Record<string, unknown> } }): void {
    event.params.data.participantsKey = normalizedParticipantsKey(event.params.data);
  },
};
