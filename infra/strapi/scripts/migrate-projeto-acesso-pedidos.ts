import { createStrapi } from '@strapi/strapi';

type ProjetoAcessoStatus = 'pendente' | 'aprovado' | 'rejeitado';

interface LegacyAclEntry {
  perfilId: string;
  estado: ProjetoAcessoStatus;
  solicitadoEm?: string;
  respondidoEm?: string;
}

interface ProjetoRecord {
  id: string | number;
  documentId?: string;
  acessoCoreACL?: unknown;
}

interface PedidoRecord {
  id: string | number;
}

interface QueryService<TRecord> {
  findMany(args?: Record<string, unknown>): Promise<TRecord[]>;
  findOne(args: Record<string, unknown>): Promise<TRecord | null>;
  create(args: Record<string, unknown>): Promise<TRecord>;
  update(args: Record<string, unknown>): Promise<TRecord>;
}

interface MigrationStrapi {
  db: {
    query(uid: 'api::projeto.projeto'): QueryService<ProjetoRecord>;
    query(uid: 'api::projeto-acesso-pedido.projeto-acesso-pedido'): QueryService<PedidoRecord>;
  };
}

interface MigrationStats {
  projetosInicializados: number;
  pedidosCriados: number;
  pedidosExistentes: number;
  projetosIgnorados: number;
  entradasInvalidas: number;
  erros: { projetoId: string | number; reason: string }[];
}

function isStatus(value: unknown): value is ProjetoAcessoStatus {
  return value === 'pendente' || value === 'aprovado' || value === 'rejeitado';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toLegacyAclEntry(value: unknown, projetoId: string | number): LegacyAclEntry {
  if (!isRecord(value)) {
    throw new Error(`Projeto ${String(projetoId)} contém entrada ACL inválida`);
  }
  const perfilId = value.perfilId;
  const estado = value.estado;
  if (typeof perfilId !== 'string' || perfilId.trim().length === 0 || !isStatus(estado)) {
    throw new Error(`Projeto ${String(projetoId)} contém ACL sem perfilId/estado canónico`);
  }
  const solicitadoEm = typeof value.solicitadoEm === 'string' ? value.solicitadoEm : undefined;
  const respondidoEm = typeof value.respondidoEm === 'string' ? value.respondidoEm : undefined;
  return {
    perfilId,
    estado,
    ...(solicitadoEm ? { solicitadoEm } : {}),
    ...(respondidoEm ? { respondidoEm } : {}),
  };
}

async function findExistingPedido(
  strapi: MigrationStrapi,
  projetoId: string | number,
  perfilId: string,
): Promise<PedidoRecord | null> {
  return strapi.db.query('api::projeto-acesso-pedido.projeto-acesso-pedido').findOne({
    where: {
      projeto: { id: projetoId },
      perfilSolicitante: { id: perfilId },
    },
    select: ['id'],
  });
}

export async function migrateProjetoAcessoPedidos(strapi: MigrationStrapi, dryRun: boolean): Promise<MigrationStats> {
  const stats: MigrationStats = {
    projetosInicializados: 0,
    pedidosCriados: 0,
    pedidosExistentes: 0,
    projetosIgnorados: 0,
    entradasInvalidas: 0,
    erros: [],
  };
  const BATCH_SIZE = 500;
  let offset = 0;
  let projetos: ProjetoRecord[] = [];

  do {
    projetos = await strapi.db.query('api::projeto.projeto').findMany({
      select: ['id', 'documentId', 'acessoCoreACL'],
      orderBy: { id: 'asc' },
      limit: BATCH_SIZE,
      offset,
    });
    offset += BATCH_SIZE;

    for (const projeto of projetos) {
    if (projeto.acessoCoreACL === null || projeto.acessoCoreACL === undefined) {
      stats.projetosInicializados += 1;
      if (!dryRun) {
        await strapi.db.query('api::projeto.projeto').update({
          where: { id: projeto.id },
          data: { acessoCoreACL: [] },
        });
      }
      continue;
    }

    if (!Array.isArray(projeto.acessoCoreACL)) {
      stats.projetosIgnorados += 1;
      stats.erros.push({ projetoId: projeto.id, reason: 'acessoCoreACL não-array' });
      continue;
    }

    for (const rawEntry of projeto.acessoCoreACL) {
      let entry: LegacyAclEntry;
      try {
        entry = toLegacyAclEntry(rawEntry, projeto.id);
      } catch (err: unknown) {
        stats.entradasInvalidas += 1;
        stats.erros.push({
          projetoId: projeto.id,
          reason: err instanceof Error ? err.message : 'entrada ACL inválida',
        });
        continue;
      }
      try {
        const existing = await findExistingPedido(strapi, projeto.id, entry.perfilId);
        if (existing) {
          stats.pedidosExistentes += 1;
          continue;
        }

        if (!dryRun) {
          await strapi.db.query('api::projeto-acesso-pedido.projeto-acesso-pedido').create({
            data: {
              projeto: projeto.id,
              perfilSolicitante: entry.perfilId,
              status: entry.estado,
              dataSolicitacao: entry.solicitadoEm,
              dataResposta: entry.respondidoEm,
            },
          });
        }
        stats.pedidosCriados += 1;
      } catch (err: unknown) {
        stats.erros.push({
          projetoId: projeto.id,
          reason: err instanceof Error ? err.message : 'falha ao criar pedido',
        });
      }
    }
  }

  } while (projetos.length === BATCH_SIZE);

  return stats;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  if (process.env.NODE_ENV === 'production' && !dryRun && !args.includes('--force')) {
    console.error('🚫 Refusing to run projeto-acesso-pedido migration in production without --force');
    process.exit(1);
  }

  const app = await createStrapi().load();
  try {
    // Fronteira de tipagem do framework Strapi: narrowing do objeto Strapi real para a
    // interface mínima MigrationStrapi (subconjunto seguro de db.query). Exceção aceite e documentada.
    const stats = await migrateProjetoAcessoPedidos(app as unknown as MigrationStrapi, dryRun);
    app.log.info(`[projeto-acesso-pedido-migration] concluída dryRun=${String(dryRun)} stats=${JSON.stringify(stats)}`);
    console.log(JSON.stringify({ migration: 'migrate-projeto-acesso-pedidos', dryRun, stats }, null, 2));
  } finally {
    await app.destroy();
  }
}

if (require.main === module) {
  void main();
}