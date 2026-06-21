import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DomainEventName, EcosystemHookName } from '@pdc/shared';
import type { DomainEvent, BaseDomainEventPayload, EcosystemHookContext, EcosystemHookResult } from '@pdc/shared';

vi.mock('../strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
  strapiPost: vi.fn(),
}));

vi.mock('../realtime/socket.service.js', () => ({
  socketService: {
    emitirNotificacao: vi.fn(),
    emitirMensagem: vi.fn(),
    emitirConquista: vi.fn(),
    emitirLandingPulse: vi.fn(),
  },
}));

vi.mock('pino', () => ({
  default: vi.fn(() => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn() })),
}));

import { notifyHook } from './notify.hook.js';
import { strapiGet, strapiPost } from '../strapi/strapi.client.js';
import { socketService } from '../realtime/socket.service.js';

const emitirNotificacaoMock = vi.mocked(socketService)['emitirNotificacao'];

function listResponse<T extends { id: string | number }>(data: T[]) {
  return {
    data,
    meta: { pagination: { page: 1, pageSize: data.length, pageCount: 1, total: data.length } },
  };
}

function makeEvent(
  name: DomainEventName,
  payload: Record<string, unknown>,
): DomainEvent<BaseDomainEventPayload> {
  return {
    id: 'evt-test-uuid',
    name,
    payload: payload as BaseDomainEventPayload,
    timestamp: new Date().toISOString(),
  };
}

const emptyContext: EcosystemHookContext = {
  results: {} as Record<EcosystemHookName, EcosystemHookResult>,
};

describe('notifyHook — FOMO triggers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(strapiPost).mockResolvedValue({ data: { id: 'notif-1' }, meta: {} });
  });

  it('VINCULO_SOLICITADO: persists vinculo_pedido notification and emits socket to destinatário', async () => {
    vi.mocked(strapiGet).mockResolvedValue(listResponse([{ id: 'perfil-dest-1' }]));

    const event = makeEvent(DomainEventName.VINCULO_SOLICITADO, {
      destinatarioId: 'user-dest',
      solicitanteId: 'user-sol',
    });

    await notifyHook.execute(event, emptyContext);

    expect(strapiPost).toHaveBeenCalledWith(
      '/notificacoes',
      expect.objectContaining({
        perfil: 'perfil-dest-1',
        tipo: 'vinculo_pedido',
        titulo: 'Nova solicitação de conexão',
        lida: false,
      }),
    );
    expect(emitirNotificacaoMock).toHaveBeenCalledWith(
      'user-dest',
      expect.objectContaining({ tipo: 'vinculo_pedido', titulo: 'Nova solicitação de conexão' }),
    );
  });

  it('VINCULO_APROVADO: persists vinculo_aprovado notification and emits socket to solicitante', async () => {
    vi.mocked(strapiGet).mockResolvedValue(listResponse([{ id: 'perfil-sol-1' }]));

    const event = makeEvent(DomainEventName.VINCULO_APROVADO, {
      destinatarioId: 'user-dest',
      solicitanteId: 'user-sol',
    });

    await notifyHook.execute(event, emptyContext);

    expect(strapiPost).toHaveBeenCalledWith(
      '/notificacoes',
      expect.objectContaining({
        perfil: 'perfil-sol-1',
        tipo: 'vinculo_aprovado',
        titulo: 'Conexão aceite!',
        lida: false,
      }),
    );
    expect(emitirNotificacaoMock).toHaveBeenCalledWith(
      'user-sol',
      expect.objectContaining({ tipo: 'vinculo_aprovado', titulo: 'Conexão aceite!' }),
    );
  });

  it('MENTORIA_SOLICITADA: persists info notification and emits socket to mentor', async () => {
    vi.mocked(strapiGet).mockResolvedValue(listResponse([{ id: 'perfil-mentor-1' }]));

    const event = makeEvent(DomainEventName.MENTORIA_SOLICITADA, {
      mentorId: 'user-mentor',
      estudanteId: 'user-est',
    });

    await notifyHook.execute(event, emptyContext);

    expect(strapiPost).toHaveBeenCalledWith(
      '/notificacoes',
      expect.objectContaining({
        perfil: 'perfil-mentor-1',
        tipo: 'info',
        titulo: 'Pedido de mentoria recebido',
        lida: false,
      }),
    );
    expect(emitirNotificacaoMock).toHaveBeenCalledWith(
      'user-mentor',
      expect.objectContaining({ tipo: 'info', titulo: 'Pedido de mentoria recebido' }),
    );
  });

  it('PROJETO_ENDORSEMENT_RECEBIDO: persists sucesso notification and emits socket to autor', async () => {
    vi.mocked(strapiGet).mockResolvedValue(listResponse([{ id: 'perfil-autor-1' }]));

    const event = makeEvent(DomainEventName.PROJETO_ENDORSEMENT_RECEBIDO, {
      autorId: 'user-autor',
      projetoId: 'proj-99',
    });

    await notifyHook.execute(event, emptyContext);

    expect(strapiPost).toHaveBeenCalledWith(
      '/notificacoes',
      expect.objectContaining({
        perfil: 'perfil-autor-1',
        tipo: 'sucesso',
        titulo: 'Talento reconhecido!',
        lida: false,
      }),
    );
    expect(emitirNotificacaoMock).toHaveBeenCalledWith(
      'user-autor',
      expect.objectContaining({ tipo: 'sucesso', titulo: 'Talento reconhecido!' }),
    );
  });

  it('VINCULO_SOLICITADO: does nothing if destinatário resolves no perfilId', async () => {
    vi.mocked(strapiGet).mockResolvedValue(listResponse([]));

    const event = makeEvent(DomainEventName.VINCULO_SOLICITADO, {
      destinatarioId: 'user-unknown',
      solicitanteId: 'user-sol',
    });

    await notifyHook.execute(event, emptyContext);

    expect(strapiPost).not.toHaveBeenCalledWith(
      '/notificacoes',
      expect.objectContaining({ tipo: 'vinculo_pedido' }),
    );
    expect(emitirNotificacaoMock).not.toHaveBeenCalled();
  });
});

describe('notifyHook — publicação de conteúdo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(strapiPost).mockResolvedValue({ data: { id: 'notif-content' }, meta: {} });
  });

  it('resolve autorId como ID relacional de perfil para PROJETO_PUBLICADO', async () => {
    vi.mocked(strapiGet).mockResolvedValue(listResponse([{ id: '9' }]));
    const event = makeEvent(DomainEventName.PROJETO_PUBLICADO, {
      autorId: '9',
      projetoId: 'doc-projeto-42',
      titulo: 'Projeto Angola',
      area: 'TECNOLOGIA',
    });

    const result = await notifyHook.execute(event, emptyContext);

    expect(strapiGet).toHaveBeenCalledWith('/perfis', {
      'filters[id][$eq]': '9',
      'fields[0]': 'id',
      'pagination[pageSize]': '1',
    });
    expect(strapiPost).toHaveBeenCalledWith('/notificacoes', expect.objectContaining({
      perfil: '9',
      tipo: 'sucesso',
      titulo: 'Actividade Processada',
    }));
    expect(result).toEqual({ status: 'sent' });
  });
});

describe('notifyHook — approval triggers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(strapiPost).mockResolvedValue({ data: { id: 'notif-approval' }, meta: {} });
  });

  it('PERFIL_APROVADO: persists aprovacao notification and emits socket to user', async () => {
    vi.mocked(strapiGet).mockResolvedValue(listResponse([{ id: 'perfil-mentor-1' }]));

    const event = makeEvent(DomainEventName.PERFIL_APROVADO, {
      perfilId: '5',
      aprovadorId: 'admin-1',
      role: 'mentor',
      userId: 'user-mentor',
    });

    const result = await notifyHook.execute(event, emptyContext);

    expect(strapiPost).toHaveBeenCalledWith(
      '/notificacoes',
      expect.objectContaining({
        perfil: 'perfil-mentor-1',
        tipo: 'aprovacao',
        titulo: 'Foste aprovado!',
        lida: false,
      }),
    );
    expect(emitirNotificacaoMock).toHaveBeenCalledWith(
      'user-mentor',
      expect.objectContaining({ tipo: 'sucesso', titulo: 'Foste aprovado!' }),
    );
    expect(result).toEqual({ status: 'sent' });
  });

  it('PERFIL_REJEITADO: persists rejeicao notification with motivo and emits socket', async () => {
    vi.mocked(strapiGet).mockResolvedValue(listResponse([{ id: 'perfil-inst-1' }]));

    const event = makeEvent(DomainEventName.PERFIL_REJEITADO, {
      perfilId: '7',
      rejeitadorId: 'admin-1',
      motivo: 'Documentos inválidos e ilegíveis',
      role: 'instituicao',
      userId: 'user-inst',
    });

    await notifyHook.execute(event, emptyContext);

    expect(strapiPost).toHaveBeenCalledWith(
      '/notificacoes',
      expect.objectContaining({
        perfil: 'perfil-inst-1',
        tipo: 'rejeicao',
        titulo: 'Perfil não aprovado',
        lida: false,
      }),
    );
    expect(emitirNotificacaoMock).toHaveBeenCalledWith(
      'user-inst',
      expect.objectContaining({
        tipo: 'aviso',
        titulo: 'Perfil não aprovado',
        mensagem: expect.stringContaining('Documentos inválidos e ilegíveis') as string,
      }),
    );
  });

  it('PERFIL_APROVADO: does nothing if userId is missing', async () => {
    const event = makeEvent(DomainEventName.PERFIL_APROVADO, {
      perfilId: '5',
      aprovadorId: 'admin-1',
      role: 'mentor',
    });

    const result = await notifyHook.execute(event, emptyContext);

    expect(strapiPost).not.toHaveBeenCalledWith('/notificacoes', expect.objectContaining({ tipo: 'aprovacao' }));
    expect(result).toEqual({ status: 'sent' });
  });
});
