import { describe, expect, it } from 'vitest';
import {
  HomeSummarySchema,
  InscricaoActivitySchema,
  TentativaActivitySchema,
  OnboardingVideoSchema,
  TrendingItemSchema,
} from './home.js';
import { MediaEntityTypeSchema, MEDIA_SIZE_LIMITS } from './schemas/media.js';

const minimalPayload = {
  greeting: 'Olá, João',
  personalizedMessage: 'Bem-vindo de volta!',
  stats: { reputacao: 42, pendingActions: 0 },
  nextDirective: null,
  socialPulse: [],
  quickActions: [],
};

const fullPayload = {
  ...minimalPayload,
  recentActivitiesCursos: [
    {
      inscricaoId: '1',
      cursoId: '10',
      cursoTitulo: 'Python Básico',
      cursoCapaUrl: null,
      progressoPercentual: 75,
      ultimaAtividadeEm: '2026-05-01T12:00:00Z',
    },
  ],
  recentActivitiesSimulacoes: [
    {
      tentativaId: '2',
      simulacaoId: '20',
      simulacaoTitulo: 'Simulação A',
      status: 'concluida' as const,
      score: 88,
      dataInicio: '2026-05-02T10:00:00Z',
    },
  ],
  onboardingVideo: {
    embedType: 'r2' as const,
    videoUrl: 'https://cdn.example.com/video.mp4',
    thumbnailUrl: null,
    duracaoSegundos: 120,
    tituloPt: 'Bem-vindo ao PDC',
    tituloEn: 'Welcome to PDC',
  },
  trendingComunidade: [
    {
      id: '3',
      tipo: 'post' as const,
      titulo: 'Post trending',
      score: 99,
      autorId: 'u1',
      capaUrl: null,
    },
  ],
  aprenderAgora: [
    {
      id: '4',
      tipo: 'curso' as const,
      titulo: 'Curso em destaque',
      score: 80,
      autorId: 'u2',
      capaUrl: 'https://cdn.example.com/capa.jpg',
    },
  ],
};

describe('HomeSummarySchema v2', () => {
  it('aceita payload mínimo (back-compat com v1)', () => {
    const result = HomeSummarySchema.safeParse(minimalPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.recentActivitiesCursos).toEqual([]);
      expect(result.data.recentActivitiesSimulacoes).toEqual([]);
      expect(result.data.onboardingVideo).toBeNull();
      expect(result.data.trendingComunidade).toEqual([]);
      expect(result.data.aprenderAgora).toEqual([]);
    }
  });

  it('aceita payload completo com todos os campos v2', () => {
    const result = HomeSummarySchema.safeParse(fullPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.recentActivitiesCursos).toHaveLength(1);
      expect(result.data.recentActivitiesSimulacoes).toHaveLength(1);
      expect(result.data.onboardingVideo?.embedType).toBe('r2');
      expect(result.data.trendingComunidade).toHaveLength(1);
      expect(result.data.aprenderAgora).toHaveLength(1);
    }
  });

  it('rejeita recentActivitiesCursos com mais de 2 items', () => {
    const threeItems = Array.from({ length: 3 }, (_, i) => ({
      inscricaoId: String(i),
      cursoId: String(i),
      cursoTitulo: `Curso ${String(i)}`,
      cursoCapaUrl: null,
      progressoPercentual: 50,
      ultimaAtividadeEm: '2026-05-01T00:00:00Z',
    }));
    const result = HomeSummarySchema.safeParse({ ...minimalPayload, recentActivitiesCursos: threeItems });
    expect(result.success).toBe(false);
  });

  it('rejeita recentActivitiesSimulacoes com mais de 2 items', () => {
    const threeItems = Array.from({ length: 3 }, (_, i) => ({
      tentativaId: String(i),
      simulacaoId: String(i),
      simulacaoTitulo: `Simulação ${String(i)}`,
      status: 'concluida' as const,
      score: 80,
      dataInicio: '2026-05-01T00:00:00Z',
    }));
    const result = HomeSummarySchema.safeParse({ ...minimalPayload, recentActivitiesSimulacoes: threeItems });
    expect(result.success).toBe(false);
  });
});

describe('InscricaoActivitySchema', () => {
  it('valida item bem-formado', () => {
    const result = InscricaoActivitySchema.safeParse({
      inscricaoId: '1',
      cursoId: '10',
      cursoTitulo: 'Python',
      cursoCapaUrl: null,
      progressoPercentual: 50,
      ultimaAtividadeEm: '2026-05-01T00:00:00Z',
    });
    expect(result.success).toBe(true);
  });
});

describe('TentativaActivitySchema', () => {
  it('valida statuses canónicos', () => {
    for (const status of ['em_progresso', 'concluida', 'falhou'] as const) {
      const result = TentativaActivitySchema.safeParse({
        tentativaId: '1',
        simulacaoId: '2',
        simulacaoTitulo: 'Sim',
        status,
        score: 70,
        dataInicio: '2026-05-01T00:00:00Z',
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('OnboardingVideoSchema', () => {
  it('valida embed types canónicos', () => {
    for (const embedType of ['r2', 'youtube', 'vimeo'] as const) {
      const result = OnboardingVideoSchema.safeParse({
        embedType,
        videoUrl: 'https://cdn.example.com/v.mp4',
        thumbnailUrl: null,
        duracaoSegundos: 60,
        tituloPt: 'PT',
        tituloEn: 'EN',
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('TrendingItemSchema', () => {
  it('valida item com capaUrl nula', () => {
    const result = TrendingItemSchema.safeParse({
      id: '1',
      tipo: 'post',
      titulo: 'Post X',
      score: 95,
      autorId: 'u1',
      capaUrl: null,
    });
    expect(result.success).toBe(true);
  });
});

describe('MediaEntityTypeSchema — onboarding-video', () => {
  it('aceita onboarding-video como entity type válido', () => {
    const result = MediaEntityTypeSchema.safeParse('onboarding-video');
    expect(result.success).toBe(true);
  });
});

describe('MEDIA_SIZE_LIMITS — 50MB bump', () => {
  const fiftyMb = 50 * 1024 * 1024;

  it('post-media === 50MB', () => {
    expect(MEDIA_SIZE_LIMITS['post-media']).toBe(fiftyMb);
  });

  it('projeto === 50MB', () => {
    expect(MEDIA_SIZE_LIMITS['projeto']).toBe(fiftyMb);
  });

  it('generic === 50MB', () => {
    expect(MEDIA_SIZE_LIMITS['generic']).toBe(fiftyMb);
  });

  it('onboarding-video === 50MB', () => {
    expect(MEDIA_SIZE_LIMITS['onboarding-video']).toBe(fiftyMb);
  });

  it('avatar mantém 2MB', () => {
    expect(MEDIA_SIZE_LIMITS['avatar']).toBe(2 * 1024 * 1024);
  });

  it('capa mantém 5MB', () => {
    expect(MEDIA_SIZE_LIMITS['capa']).toBe(5 * 1024 * 1024);
  });

  it('curso-capa mantém 5MB', () => {
    expect(MEDIA_SIZE_LIMITS['curso-capa']).toBe(5 * 1024 * 1024);
  });
});
