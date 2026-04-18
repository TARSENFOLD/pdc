import { describe, expect, it, vi, beforeEach } from 'vitest';
import { eventBus } from './event-bus.js';
import { strapiPost, strapiPut } from '../strapi/strapi.client.js';

vi.mock('../strapi/strapi.client.js', () => ({
  strapiPost: vi.fn(),
  strapiPut: vi.fn(),
}));

describe('EventBus com Outbox Pattern', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve emitir e receber eventos transientes sem outbox', () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    eventBus.subscribe('test.transient', handler);

    eventBus.publish({
      id: '123',
      name: 'test.transient',
      payload: { value: true },
      timestamp: new Date().toISOString()
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(strapiPost).not.toHaveBeenCalled();
  });

  it('deve persistir no outbox antes de emitir e marcar como processado (Happy Path)', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    eventBus.subscribe('test.critical', handler);

    vi.mocked(strapiPost).mockResolvedValueOnce({ data: { documentId: 'doc-123' } });

    await eventBus.publishWithOutbox('test.critical', { value: 42 });

    expect(strapiPost).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(strapiPut).toHaveBeenCalledWith('/domain-events/doc-123', expect.objectContaining({
      data: expect.objectContaining({ processed: true })
    }));
  });

  it('deve lançar erro e abortar se a persistencia no Outbox falhar', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    eventBus.subscribe('test.fail', handler);

    vi.mocked(strapiPost).mockRejectedValueOnce(new Error('Strapi DB offline'));

    await expect(eventBus.publishWithOutbox('test.fail', {})).rejects.toThrow('Falha na camada Outbox');

    expect(handler).not.toHaveBeenCalled();
    expect(strapiPut).not.toHaveBeenCalled();
  });
});
