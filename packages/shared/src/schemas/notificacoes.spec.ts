import { describe, expect, it } from 'vitest';
import { WebPushNotificationPayloadSchema } from './notificacoes.js';

describe('WebPushNotificationPayloadSchema', () => {
  it('aceita payload compacto de Web Push', () => {
    expect(WebPushNotificationPayloadSchema.parse({
      title: 'Nova conquista',
      body: 'Recebeste uma nova conquista.',
      url: '/app/conquistas',
      tag: 'conquista-1',
      data: { eventId: 'evt-1' },
    })).toMatchObject({ title: 'Nova conquista' });
  });

  it('rejeita payloads acima dos limites seguros de Web Push', () => {
    expect(WebPushNotificationPayloadSchema.safeParse({
      title: 'x'.repeat(101),
      body: 'x'.repeat(501),
      url: `/${'x'.repeat(2048)}`,
      tag: 'x'.repeat(129),
    }).success).toBe(false);
  });

  it('rejeita payload cujo JSON serializado excede 4KB em bytes UTF-8', () => {
    const big = WebPushNotificationPayloadSchema.safeParse({
      title: 'ç'.repeat(100), // 100 chars (200 bytes) — dentro do limite individual
      body: 'ç'.repeat(500), // 500 chars (1000 bytes) — dentro do limite individual
      url: `/${'x'.repeat(2040)}`, // 2041 bytes — dentro do limite individual
      icon: `/${'x'.repeat(2040)}`,
      badge: `/${'x'.repeat(2040)}`,
    });
    expect(big.success).toBe(false);
  });
});