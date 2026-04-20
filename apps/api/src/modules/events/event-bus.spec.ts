import { describe, expect, it, vi, beforeEach } from 'vitest';
import { eventBus } from './event-bus.js';
import { DomainEventName } from './types.js';

describe('EventBus (Registry & EventEmitter)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventBus.removeAllListeners();
  });

  it('deve possuir método register() para registry explícito (D1)', () => {
    expect(typeof eventBus.register).toBe('function');
  });

  it('deve disparar todos os handlers registados para um evento', async () => {
    const handler1 = vi.fn().mockResolvedValue(undefined);
    const handler2 = vi.fn().mockResolvedValue(undefined);
    const otherHandler = vi.fn().mockResolvedValue(undefined);

    eventBus.register(DomainEventName.TENTATIVA_CONCLUIDA, handler1);
    eventBus.register(DomainEventName.TENTATIVA_CONCLUIDA, handler2);
    eventBus.register(DomainEventName.CURSO_CONCLUIDO, otherHandler);

    await eventBus.publish({
      id: '1',
      name: DomainEventName.TENTATIVA_CONCLUIDA,
      payload: {},
      timestamp: new Date().toISOString()
    });

    expect(handler1).toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();
    expect(otherHandler).not.toHaveBeenCalled();
  });

  it('deve suportar múltiplos handlers resolvendo em paralelo via publish', async () => {
    const callOrder: string[] = [];
    const handlerSlow = vi.fn().mockImplementation(async () => {
      await new Promise(r => setTimeout(r, 50));
      callOrder.push('slow');
    });
    const handlerFast = vi.fn().mockImplementation(async () => {
      callOrder.push('fast');
    });

    eventBus.register('test.parallel', handlerSlow);
    eventBus.register('test.parallel', handlerFast);

    await eventBus.publish({
      id: '2',
      name: 'test.parallel',
      payload: {},
      timestamp: new Date().toISOString()
    });

    expect(callOrder).toContain('slow');
    expect(callOrder).toContain('fast');
    expect(handlerSlow).toHaveBeenCalled();
    expect(handlerFast).toHaveBeenCalled();
  });
});
