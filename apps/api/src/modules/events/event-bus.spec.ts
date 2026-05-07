import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eventBus } from './event-bus.js';
import type { DomainEvent } from './types.js';
import { DomainEventName } from '@pdc/shared';

describe('EventBus', () => {
  beforeEach(() => {
    eventBus.removeAllListeners();
  });

  it('deve registrar e chamar um handler para um evento', async () => {
    const handler = vi.fn();
    eventBus.register(DomainEventName.LOGIN, handler);

    const event: DomainEvent = {
      id: '123',
      name: DomainEventName.LOGIN,
      payload: { userId: 'test' },
      timestamp: new Date().toISOString(),
    };

    await eventBus.publish(event);

    expect(handler).toHaveBeenCalledWith(event);
  });

  it('deve lidar com eventos sem handlers registrados', async () => {
    const event: DomainEvent = {
      id: '456',
      name: DomainEventName.LOGOUT,
      payload: { userId: '123' }, // Mock rigoroso para satisfazer Zod
      timestamp: new Date().toISOString(),
    };

    await expect(eventBus.publish(event)).resolves.toBeUndefined();
  });

  it('deve executar múltiplos handlers em paralelo via allSettled', async () => {
    const handler1 = vi.fn().mockResolvedValue({ status: 'sent' });
    const handler2 = vi.fn().mockRejectedValue(new Error('Falha simulada'));

    eventBus.register(DomainEventName.PERFIL_ATUALIZADO, handler1);
    eventBus.register(DomainEventName.PERFIL_ATUALIZADO, handler2);

    const event: DomainEvent = {
      id: '789',
      name: DomainEventName.PERFIL_ATUALIZADO,
      payload: { perfilId: 'abc' },
      timestamp: new Date().toISOString(),
    };

    // No G15, falhas de hooks individuais são contidas (retryable_error), não deitam o bus abaixo
    await expect(eventBus.publish(event)).resolves.toBeUndefined();
    expect(handler1).toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();
  });
});
