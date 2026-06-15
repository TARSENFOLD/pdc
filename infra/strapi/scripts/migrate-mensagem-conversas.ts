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

function orderedPair(first: PerfilRef, second: PerfilRef): [PerfilRef, PerfilRef] {
  const comparison = String(first.id).localeCompare(String(second.id), undefined, { numeric: true });
  return comparison <= 0 ? [first, second] : [second, first];
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

      try {
        const [participant1, participant2] = orderedPair(message.remetente, message.destinatario);
        const participantsKey = `${String(participant1.id)}:${String(participant2.id)}`;
        const existing = await strapi.documents('api::conversa.conversa').findMany({
          filters: { participantsKey },
          limit: 1,
        });
        const conversa = existing[0] ?? await strapi.documents('api::conversa.conversa').create({
          data: {
            participant1: participant1.id,
            participant2: participant2.id,
            participantsKey,
            criadoEm: message.criadoEm ?? message.createdAt ?? new Date().toISOString(),
          },
        });
        await strapi.db.query('api::mensagem.mensagem').update({
          where: { id: message.id },
          data: {
            conversa: conversa.id,
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
