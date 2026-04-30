import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { eventBus } from '../events/event-bus.js';
import { EcosystemHookName, DomainEventName, type EcosystemHook, type DomainEvent } from '@pdc/shared';

vi.mock('../strapi/strapi.client.js', () => ({
  strapiPost: vi.fn().mockResolvedValue({ data: { id: 1 }, meta: {} }),
  strapiPut: vi.fn().mockResolvedValue({ data: { id: 1 }, meta: {} }),
  strapiGet: vi.fn().mockResolvedValue({ data: [], meta: {} }),
}));

vi.mock('../../lib/redis.js', () => ({
  redis: {
    sadd: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    del: vi.fn().mockResolvedValue(1),
  },
}));

// The 6 canonical G15 hooks and their expected registration order in apps/api/src/index.ts
const CANONICAL_HOOKS = [
  EcosystemHookName.RANKING,
  EcosystemHookName.FEED,
  EcosystemHookName.MATCH,
  EcosystemHookName.BEHAVIOR,
  EcosystemHookName.ACHIEVEMENT,
  EcosystemHookName.NOTIFY,
] as const;

describe('G15 Runtime Topology — characterization', () => {
  // ── Static: verify hook registrations in apps/api/src/index.ts ──────────────

  it('os 6 hooks G15 canónicos estão todos registados em apps/api/src/index.ts', () => {
    const indexPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../index.ts');
    const source = fs.readFileSync(indexPath, 'utf8');

    for (const hookName of CANONICAL_HOOKS) {
      expect(
        source,
        `registerHook para '${hookName}' não encontrado em index.ts`,
      ).toMatch(new RegExp(`registerHook\\(${hookName}Hook\\)`));
    }
  });

  it('notifyHook é registado após todos os outros hooks em apps/api/src/index.ts', () => {
    const indexPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../index.ts');
    const source = fs.readFileSync(indexPath, 'utf8');

    const positions = CANONICAL_HOOKS.map((name) => ({
      name,
      pos: source.indexOf(`registerHook(${name}Hook)`),
    }));

    const notifyEntry = positions.find((h) => h.name === EcosystemHookName.NOTIFY);
    if (!notifyEntry) {
      throw new Error('registerHook(notifyHook) não encontrado');
    }
    expect(notifyEntry.pos, `registerHook(notifyHook) não encontrado`).toBeGreaterThanOrEqual(0);

    for (const entry of positions.filter((h) => h.name !== EcosystemHookName.NOTIFY)) {
      expect(
        notifyEntry.pos,
        `notifyHook deve ser registado depois de ${entry.name}Hook`,
      ).toBeGreaterThan(entry.pos);
    }
  });

  // ── Behavioural: verify notify executes after all independent hooks ──────────

  describe('dispatchHooks: notify executa na fase 2 (após hooks independentes)', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      eventBus.removeAllListeners();
    });

    it('notify é o último hook a terminar independentemente da ordem de registo', async () => {
      const completionOrder: EcosystemHookName[] = [];

      const makeHook = (name: EcosystemHookName, delay = 0): EcosystemHook => ({
        name,
        dependencies: [],
        idempotencyKey: (e) => e.id,
        execute: async () => {
          if (delay > 0) await new Promise((r) => setTimeout(r, delay));
          completionOrder.push(name);
          return { status: 'sent' };
        },
      });

      // Register with delays to prove notify waits for phase 1 regardless of timing
      eventBus.registerHook(makeHook(EcosystemHookName.RANKING, 20));
      eventBus.registerHook(makeHook(EcosystemHookName.FEED, 10));
      eventBus.registerHook(makeHook(EcosystemHookName.MATCH, 5));
      eventBus.registerHook(makeHook(EcosystemHookName.BEHAVIOR, 15));
      eventBus.registerHook(makeHook(EcosystemHookName.ACHIEVEMENT, 1));
      eventBus.registerHook(makeHook(EcosystemHookName.NOTIFY, 0));

      const event: DomainEvent = {
        id: crypto.randomUUID(),
        name: DomainEventName.PERFIL_ATUALIZADO,
        payload: { perfilId: 'p-topology-test' },
        timestamp: new Date().toISOString(),
        correlationId: crypto.randomUUID(),
      };

      await eventBus.publish(event);

      expect(completionOrder).toHaveLength(6);
      expect(completionOrder[completionOrder.length - 1]).toBe(EcosystemHookName.NOTIFY);

      // All 5 independent hooks executed before notify
      const notifyIndex = completionOrder.indexOf(EcosystemHookName.NOTIFY);
      const independentHooks = CANONICAL_HOOKS.filter((h) => h !== EcosystemHookName.NOTIFY);
      for (const hookName of independentHooks) {
        const hookIndex = completionOrder.indexOf(hookName);
        expect(hookIndex, `${hookName} deve executar antes de notify`).toBeLessThan(notifyIndex);
      }
    });

    it('todos os 6 hooks têm nomes canónicos presentes após registo completo', async () => {
      const executedHooks: EcosystemHookName[] = [];

      for (const name of CANONICAL_HOOKS) {
        const hook: EcosystemHook = {
          name,
          dependencies: [],
          idempotencyKey: (e) => e.id,
          execute: () => {
            executedHooks.push(name);
            return Promise.resolve({ status: 'sent' });
          },
        };
        eventBus.registerHook(hook);
      }

      const event: DomainEvent = {
        id: crypto.randomUUID(),
        name: DomainEventName.PERFIL_ATUALIZADO,
        payload: { perfilId: 'p-names-test' },
        timestamp: new Date().toISOString(),
        correlationId: crypto.randomUUID(),
      };

      await eventBus.publish(event);

      for (const hookName of CANONICAL_HOOKS) {
        expect(executedHooks, `Hook ${hookName} não executou`).toContain(hookName);
      }
    });
  });
});
