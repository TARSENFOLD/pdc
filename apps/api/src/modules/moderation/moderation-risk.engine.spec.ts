import { describe, expect, it, vi } from 'vitest';
import { assessPostModerationRisk, type ModerationProfile } from './moderation-risk.engine.js';

const stableNow = new Date('2026-04-30T12:00:00.000Z');

const trustedProfile: ModerationProfile = {
  id: 'perfil-1',
  createdAt: '2026-04-01T12:00:00.000Z',
  reputacao: 20,
};

describe('ModerationRiskEngine', () => {
  it('auto-aprova publicação normal de conta estabelecida', async () => {
    const result = await assessPostModerationRisk(
      {
        corpo: 'Hoje descobri uma forma melhor de estudar engenharia com simulações práticas.',
        profile: trustedProfile,
      },
      {
        now: () => stableNow,
        hasDuplicateRecentPost: vi.fn().mockResolvedValue(false),
      },
    );

    expect(result).toEqual({
      decision: 'auto_approve',
      severity: 'low',
      score: 0,
      reasons: [],
    });
  });

  it('envia para revisão quando encontra link suspeito e padrão repetitivo', async () => {
    const result = await assessPostModerationRisk(
      {
        corpo: 'Vejam isto em http://bit.ly/oferta agora agora agora agora agora agora agora agora agora agora agora agora',
        profile: trustedProfile,
      },
      {
        now: () => stableNow,
        hasDuplicateRecentPost: vi.fn().mockResolvedValue(false),
      },
    );

    expect(result.decision).toBe('needs_review');
    expect(result.severity).toBe('medium');
    expect(result.score).toBe(0.6);
    expect(result.reasons).toEqual(['suspicious_link', 'repetitive_pattern']);
  });

  it('considera duplicado recente como risco de revisão', async () => {
    const duplicateChecker = vi.fn().mockResolvedValue(true);

    const result = await assessPostModerationRisk(
      {
        corpo: 'Mesmo texto publicado outra vez sobre o mesmo curso.',
        profile: { id: 'perfil-2', createdAt: '2026-04-30T06:00:00.000Z', reputacao: 0 },
      },
      {
        now: () => stableNow,
        hasDuplicateRecentPost: duplicateChecker,
      },
    );

    expect(duplicateChecker).toHaveBeenCalledOnce();
    expect(result.decision).toBe('needs_review');
    expect(result.reasons).toEqual(['duplicate_recent']);
  });

  it('auto-aprova publicação normal mesmo quando a conta é recente', async () => {
    const result = await assessPostModerationRisk(
      {
        corpo: 'Estou a explorar opções de curso e gostei da experiência.',
        profile: { id: 'perfil-4', createdAt: '2026-04-27T12:00:00.000Z', reputacao: 0 },
      },
      {
        now: () => stableNow,
        hasDuplicateRecentPost: vi.fn().mockResolvedValue(false),
      },
    );

    expect(result).toEqual({
      decision: 'auto_approve',
      severity: 'low',
      score: 0,
      reasons: [],
    });
  });

  it('auto-oculta apenas risco alto combinado', async () => {
    const result = await assessPostModerationRisk(
      {
        corpo: 'kill yourself http://bit.ly/x spam spam spam spam spam spam spam spam spam spam spam spam',
        profile: { id: 'perfil-3', createdAt: '2026-04-30T11:00:00.000Z', reputacao: -1 },
      },
      {
        now: () => stableNow,
        hasDuplicateRecentPost: vi.fn().mockResolvedValue(true),
      },
    );

    expect(result.decision).toBe('auto_hide');
    expect(result.severity).toBe('high');
    expect(result.score).toBe(1);
    expect(result.reasons).toEqual([
      'suspicious_link',
      'abusive_language',
      'repetitive_pattern',
      'low_reputation',
      'duplicate_recent',
    ]);
  });
});
