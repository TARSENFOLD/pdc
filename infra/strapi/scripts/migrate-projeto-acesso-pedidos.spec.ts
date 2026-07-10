import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { migrateProjetoAcessoPedidos } from './migrate-projeto-acesso-pedidos';

interface FakeProjetoRecord {
  id: string | number;
  acessoCoreACL?: unknown;
}

interface FakePedidoRecord {
  id: string | number;
}

interface FakeQuery<TRecord> {
  findMany(args?: Record<string, unknown>): Promise<TRecord[]>;
  findOne(args: Record<string, unknown>): Promise<TRecord | null>;
  create(args: Record<string, unknown>): Promise<TRecord>;
  update(args: Record<string, unknown>): Promise<TRecord>;
}

function createFakeStrapi(projetos: FakeProjetoRecord[], existingPedido: FakePedidoRecord | null = null) {
  const created: Record<string, unknown>[] = [];
  const updated: Record<string, unknown>[] = [];

  const projetoQuery: FakeQuery<FakeProjetoRecord> = {
    findMany: () => Promise.resolve(projetos),
    findOne: () => Promise.resolve(null),
    create: () => Promise.resolve({ id: 'unused' }),
    update: (args) => {
      updated.push(args);
      return Promise.resolve({ id: 'updated' });
    },
  };

  const pedidoQuery: FakeQuery<FakePedidoRecord> = {
    findMany: () => Promise.resolve([]),
    findOne: () => Promise.resolve(existingPedido),
    create: (args) => {
      created.push(args);
      return Promise.resolve({ id: `pedido-${created.length.toString()}` });
    },
    update: () => Promise.resolve({ id: 'unused' }),
  };

  return {
    created,
    updated,
    strapi: {
      db: {
        query(uid: string): FakeQuery<FakeProjetoRecord> | FakeQuery<FakePedidoRecord> {
          if (uid === 'api::projeto.projeto') return projetoQuery;
          if (uid === 'api::projeto-acesso-pedido.projeto-acesso-pedido') return pedidoQuery;
          throw new Error(`Unexpected UID: ${uid}`);
        },
      },
    },
  };
}

void describe('migrateProjetoAcessoPedidos', () => {
  void it('continua após ACL malformada e processa projetos seguintes', async () => {
    const fake = createFakeStrapi([
      { id: 'proj-null', acessoCoreACL: null },
      { id: 'proj-bad-array', acessoCoreACL: { invalid: true } },
      { id: 'proj-bad-entry', acessoCoreACL: [{ perfilId: '', estado: 'pendente' }] },
      { id: 'proj-ok', acessoCoreACL: [{ perfilId: 'perfil-1', estado: 'aprovado', solicitadoEm: '2025-12-31T23:00:00.000Z', respondidoEm: '2026-01-01T00:00:00.000Z' }] },
    ]);

    const stats = await migrateProjetoAcessoPedidos(fake.strapi, false);

    assert.equal(stats.projetosInicializados, 1);
    assert.equal(stats.projetosIgnorados, 1);
    assert.equal(stats.entradasInvalidas, 1);
    assert.equal(stats.pedidosCriados, 1);
    assert.equal(fake.created.length, 1);
    assert.deepEqual(fake.created[0], {
      data: {
        projeto: 'proj-ok',
        perfilSolicitante: 'perfil-1',
        status: 'aprovado',
        dataSolicitacao: '2025-12-31T23:00:00.000Z',
        dataResposta: '2026-01-01T00:00:00.000Z',
      },
    });
    assert.equal(fake.updated.length, 1);
    assert.equal(stats.erros.length, 2);
  });

  void it('não escreve nada em dryRun', async () => {
    const fake = createFakeStrapi([
      { id: 'proj-null', acessoCoreACL: null },
      { id: 'proj-ok', acessoCoreACL: [{ perfilId: 'perfil-1', estado: 'aprovado', solicitadoEm: '2025-12-31T23:00:00.000Z', respondidoEm: '2026-01-01T00:00:00.000Z' }] },
    ]);

    const stats = await migrateProjetoAcessoPedidos(fake.strapi, true);

    assert.equal(fake.created.length, 0);
    assert.equal(fake.updated.length, 0);
    assert.equal(stats.projetosInicializados, 1);
    assert.equal(stats.pedidosCriados, 1);
  });

  void it('não recria pedidos já migrados', async () => {
    const fake = createFakeStrapi([
      { id: 'proj-existing', acessoCoreACL: [{ perfilId: 'perfil-1', estado: 'pendente', solicitadoEm: '2026-01-01T00:00:00.000Z' }] },
    ], { id: 'pedido-existente' });

    const stats = await migrateProjetoAcessoPedidos(fake.strapi, false);

    assert.equal(stats.pedidosExistentes, 1);
    assert.equal(stats.pedidosCriados, 0);
    assert.equal(fake.created.length, 0);
  });
});