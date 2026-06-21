import type { Core } from '@strapi/strapi';

interface PerfilRef {
  id: number;
  documentId?: string;
}

interface MensagemLegada {
  id: number;
  documentId?: string;
  remetente?: PerfilRef | null;
  destinatario?: PerfilRef | null;
  conversa?: { id: number } | null;
  criadoEm?: string;
  createdAt?: string;
}

interface ConversaMigrada {
  id?: string | number;
  documentId?: string;
}

function orderedPair(first: PerfilRef, second: PerfilRef): [PerfilRef, PerfilRef] {
  const comparison = compareParticipantIds(String(first.id), String(second.id));
  return comparison <= 0 ? [first, second] : [second, first];
}

function compareParticipantIds(first: string, second: string): number {
  if (/^\d+$/.test(first) && /^\d+$/.test(second)) {
    const leftNumber = BigInt(first);
    const rightNumber = BigInt(second);
    return leftNumber === rightNumber ? 0 : leftNumber < rightNumber ? -1 : 1;
  }
  return first < second ? -1 : first > second ? 1 : 0;
}

export async function migrateMensagemConversas(strapi: Core.Strapi): Promise<void> {
  const pageSize = 100;
  let start = 0;
  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  while (true) {
    const messages = await strapi.documents('api::mensagem.mensagem').findMany({
      populate: ['remetente', 'destinatario', 'conversa'],
      limit: pageSize,
      start,
    }) as unknown as MensagemLegada[];
    if (messages.length === 0) break;

    for (const message of messages) {
      if (message.conversa) {
        skipped++;
        continue;
      }
      if (!message.remetente || !message.destinatario || message.remetente.id === message.destinatario.id) {
        failed++;
        strapi.log.error(`[mensagem-conversa-migration] mensagem=${String(message.id)} participantes inválidos`);
        continue;
      }
      if (!message.documentId) {
        failed++;
        strapi.log.error(`[mensagem-conversa-migration] mensagem=${String(message.id)} sem documentId`);
        continue;
      }

      try {
        const [participant1, participant2] = orderedPair(message.remetente, message.destinatario);
        const participantsKey = `${String(participant1.id)}:${String(participant2.id)}`;
        const existing = await strapi.documents('api::conversa.conversa').findMany({
          filters: { participantsKey },
          limit: 1,
        }) as ConversaMigrada[];
        const conversa = existing[0] ?? await createOrRefetchConversa(strapi, {
          participant1,
          participant2,
          participantsKey,
          criadoEm: message.criadoEm ?? message.createdAt ?? new Date().toISOString(),
        });
        if (!conversa.documentId) {
          throw new Error(`Conversa ${String(conversa.id)} sem documentId`);
        }
        await strapi.documents('api::mensagem.mensagem').update({
          documentId: message.documentId,
          data: {
            conversa: conversa.documentId,
          },
        });
        migrated++;
      } catch (error) {
        failed++;
        const detail = error instanceof Error ? error.message : String(error);
        strapi.log.error(`[mensagem-conversa-migration] mensagem=${String(message.id)} error=${detail}`);
      }
    }

    start += messages.length;
    if (messages.length < pageSize) break;
  }

  strapi.log.info(
    `[mensagem-conversa-migration] migrated=${String(migrated)} skipped=${String(skipped)} failed=${String(failed)}`,
  );
  if (failed > 0) {
    throw new Error(`Migração mensagem/conversa terminou com ${String(failed)} falha(s)`);
  }
}

export default migrateMensagemConversas;

async function createOrRefetchConversa(
  strapi: Core.Strapi,
  input: {
    participant1: PerfilRef;
    participant2: PerfilRef;
    participantsKey: string;
    criadoEm: string;
  },
): Promise<ConversaMigrada> {
  try {
    return await strapi.documents('api::conversa.conversa').create({
      data: {
        participant1: input.participant1.id,
        participant2: input.participant2.id,
        participantsKey: input.participantsKey,
        criadoEm: input.criadoEm,
      },
    }) as ConversaMigrada;
  } catch (error) {
    const existing = await strapi.documents('api::conversa.conversa').findMany({
      filters: { participantsKey: input.participantsKey },
      limit: 1,
    }) as ConversaMigrada[];
    if (existing[0]) return existing[0];
    throw error;
  }
}
