import { Hono } from 'hono';
import pino from 'pino';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { redis } from '../lib/redis.js';
import {
  fetchCandidates,
  getItemStats,
  buildFeatures,
  calcRecencyScore,
  calcScore,
  mapConcurrent,
  HYDRATION_CONCURRENCY,
  type StrapiEntity,
} from './feed.helpers.js';
import { getWeights } from '../modules/feed/feed.weights.js';
import type {
  HomeSummary,
  InscricaoActivity,
  TentativaActivity,
  OnboardingVideo,
  TrendingItem,
  FeedItemTipo,
} from '@pdc/shared';

const log = pino({ name: 'routes:home' });

type Vars = { Variables: AuthVariables };
export const homeRoutes = new Hono<Vars>();

// ── Strapi shape interfaces ──────────────────────────────────────────────────

interface PerfilStats {
  id: string | number;
  xp?: number;
  reputacao?: number;
  conquistasCount?: number;
  nome?: string;
}

interface InscricaoRaw {
  id: string | number;
  progressoPercentual?: number;
  ultimaAtividadeEm?: string;
  createdAt?: string;
  curso?: {
    id: string | number;
    titulo?: string;
    capaUrl?: string | null;
  };
}

interface TentativaRaw {
  id: string | number;
  status?: 'em_progresso' | 'concluida' | 'falhou';
  score?: number;
  dataInicio?: string;
  createdAt?: string;
  simulacao?: {
    id: string | number;
    titulo?: string;
  };
}

interface OnboardingVideoRaw {
  id: string | number;
  embedType?: 'r2' | 'youtube' | 'vimeo';
  videoUrl?: string;
  thumbnailUrl?: string | null;
  duracaoSegundos?: number;
  tituloPt?: string;
  tituloEn?: string;
}

// ── Partition sets ───────────────────────────────────────────────────────────

const COMMUNITY_TIPOS = new Set<FeedItemTipo>(['post', 'projeto']);
const LEARNING_TIPOS = new Set<FeedItemTipo>(['curso', 'simulacao', 'experiencia', 'programa']);

// ── Quick Actions por role (BFF SSOT — INV-B2: 5 botões) ─────────────────────

type QuickActionItem = { label: string; to: string; icon: string; variant: 'primary' | 'secondary' | 'ghost' };
const QUICK_ACTIONS_BY_ROLE: Record<string, QuickActionItem[]> = {
  estudante: [
    { label: 'Simulações', to: '/app/simulacoes', icon: 'FlaskConical', variant: 'primary' },
    { label: 'Programa', to: '/app/programas', icon: 'GraduationCap', variant: 'secondary' },
    { label: 'Projecto', to: '/app/explorar', icon: 'FolderKanban', variant: 'secondary' },
    { label: 'Cursos', to: '/app/cursos', icon: 'BookOpen', variant: 'secondary' },
    { label: 'Feed', to: '/app/feed', icon: 'Zap', variant: 'secondary' },
  ],
  mentor: [
    { label: 'Simulações', to: '/app/mentor/simulacoes', icon: 'FlaskConical', variant: 'primary' },
    { label: 'Programa', to: '/app/instituicao/programas', icon: 'GraduationCap', variant: 'secondary' },
    { label: 'Projecto', to: '/app/explorar', icon: 'FolderKanban', variant: 'secondary' },
    { label: 'Cursos', to: '/app/mentor/cursos', icon: 'BookOpen', variant: 'secondary' },
    { label: 'Feed', to: '/app/feed', icon: 'Zap', variant: 'secondary' },
  ],
  instituicao: [
    { label: 'Programas', to: '/app/instituicao/programas', icon: 'GraduationCap', variant: 'primary' },
    { label: 'Experiências', to: '/app/instituicao/experiencias', icon: 'BookOpen', variant: 'secondary' },
    { label: 'Projecto', to: '/app/explorar', icon: 'FolderKanban', variant: 'secondary' },
    { label: 'Feed', to: '/app/feed', icon: 'Zap', variant: 'secondary' },
    { label: 'Relatórios', to: '/app/dashboard/instituicao', icon: 'BarChart2', variant: 'secondary' },
  ],
  moderador: [
    { label: 'Aprovações', to: '/app/admin/aprovacoes', icon: 'CheckCircle', variant: 'primary' },
    { label: 'Moderação', to: '/app/moderacao', icon: 'Shield', variant: 'secondary' },
    { label: 'Simulações', to: '/app/simulacoes', icon: 'FlaskConical', variant: 'secondary' },
    { label: 'Feed', to: '/app/feed', icon: 'Zap', variant: 'secondary' },
    { label: 'Dashboard', to: '/app/dashboard/moderador', icon: 'BarChart2', variant: 'secondary' },
  ],
  super_admin: [
    { label: 'Aprovações', to: '/app/admin/aprovacoes', icon: 'CheckCircle', variant: 'primary' },
    { label: 'Moderação', to: '/app/moderacao', icon: 'Shield', variant: 'secondary' },
    { label: 'Dashboard', to: '/app/dashboard/admin', icon: 'BarChart2', variant: 'secondary' },
    { label: 'Feed', to: '/app/feed', icon: 'Zap', variant: 'secondary' },
    { label: 'Simulações', to: '/app/simulacoes', icon: 'FlaskConical', variant: 'secondary' },
  ],
};

// ── Compute ──────────────────────────────────────────────────────────────────

async function computeHomeSummary(userId: string, role: string): Promise<HomeSummary> {
  const [perfilRes, inscricoesRes, tentativasRes, videosRes, candidates] = await Promise.all([
    strapiGet<PerfilStats>('/perfis', {
      'filters[userId][$eq]': userId,
      'fields': 'xp,reputacao,conquistasCount,nome',
    }),
    strapiGet<InscricaoRaw>('/inscricoes', {
      'filters[perfil][userId][$eq]': userId,
      'sort': 'ultimaAtividadeEm:desc',
      'pagination[pageSize]': '2',
      'populate': 'curso',
    }).catch(() => ({
      data: [] as (InscricaoRaw & { id: string | number })[],
      meta: { pagination: { page: 1, pageSize: 2, pageCount: 0, total: 0 } },
    })),
    strapiGet<TentativaRaw>('/tentativas', {
      'filters[perfil][userId][$eq]': userId,
      'sort': 'dataInicio:desc',
      'pagination[pageSize]': '2',
      'populate': 'simulacao',
    }).catch(() => ({
      data: [] as (TentativaRaw & { id: string | number })[],
      meta: { pagination: { page: 1, pageSize: 2, pageCount: 0, total: 0 } },
    })),
    strapiGet<OnboardingVideoRaw>('/onboarding-videos', {
      'filters[role][$eq]': role,
      'pagination[pageSize]': '1',
    }).catch(() => ({
      data: [] as (OnboardingVideoRaw & { id: string | number })[],
      meta: { pagination: { page: 1, pageSize: 1, pageCount: 0, total: 0 } },
    })),
    fetchCandidates().catch(() => [] as Array<StrapiEntity & { tipo: FeedItemTipo }>),
  ]);

  const perfil = perfilRes.data[0];

  const recentActivitiesCursos: InscricaoActivity[] = inscricoesRes.data.flatMap((i) => {
    if (i.curso == null) return [];
    const curso = i.curso;
    return [{
      inscricaoId: String(i.id),
      cursoId: String(curso.id),
      cursoTitulo: curso.titulo ?? 'Curso sem título',
      cursoCapaUrl: curso.capaUrl ?? null,
      progressoPercentual: i.progressoPercentual ?? 0,
      ultimaAtividadeEm: i.ultimaAtividadeEm ?? i.createdAt ?? new Date().toISOString(),
    }];
  });

  const recentActivitiesSimulacoes: TentativaActivity[] = tentativasRes.data.flatMap((t) => {
    if (t.simulacao == null) return [];
    const simulacao = t.simulacao;
    return [{
      tentativaId: String(t.id),
      simulacaoId: String(simulacao.id),
      simulacaoTitulo: simulacao.titulo ?? 'Simulação sem título',
      status: t.status ?? 'em_progresso',
      score: t.score ?? 0,
      dataInicio: t.dataInicio ?? t.createdAt ?? new Date().toISOString(),
    }];
  });

  const rawVideo = videosRes.data[0];
  const onboardingVideo: OnboardingVideo | null = rawVideo
    ? {
        embedType: rawVideo.embedType ?? 'youtube',
        videoUrl: rawVideo.videoUrl ?? '',
        thumbnailUrl: rawVideo.thumbnailUrl ?? null,
        duracaoSegundos: rawVideo.duracaoSegundos ?? 0,
        tituloPt: rawVideo.tituloPt ?? '',
        tituloEn: rawVideo.tituloEn ?? '',
      }
    : null;

  const weights = await getWeights('trending');

  async function scoreAndMap(items: Array<StrapiEntity & { tipo: FeedItemTipo }>): Promise<TrendingItem[]> {
    const scored = await mapConcurrent(
      items,
      async (cand) => {
        const stats = await getItemStats(cand.tipo, String(cand.id));
        const recencyScore = calcRecencyScore(cand.publishedAt ?? cand.createdAt, cand.tipo);
        const features = buildFeatures(stats, recencyScore, 0, 0);
        const score = calcScore(features, weights);
        return {
          id: String(cand.id),
          tipo: cand.tipo,
          titulo: cand.titulo ?? cand.descricao ?? cand.corpo ?? cand.tipo,
          score,
          autorId: String(cand.autor?.userId ?? cand.autor?.id ?? cand.autorId ?? cand.id),
          capaUrl: cand.capaUrl ?? null,
        } satisfies TrendingItem;
      },
      HYDRATION_CONCURRENCY,
    );
    return scored.sort((a, b) => b.score - a.score).slice(0, 10);
  }

  const [trendingComunidade, aprenderAgora] = await Promise.all([
    scoreAndMap(candidates.filter((c) => COMMUNITY_TIPOS.has(c.tipo))),
    scoreAndMap(candidates.filter((c) => LEARNING_TIPOS.has(c.tipo))),
  ]);

  const nomePerfil = perfil?.nome?.split(' ')[0] ?? 'estudante';

  // nextDirective: contextual next action derived from user state
  const inProgressInscricao = inscricoesRes.data.find(
    (i) => i.progressoPercentual != null && i.progressoPercentual > 0 && i.progressoPercentual < 100
  );
  const inProgressTentativa = tentativasRes.data.find((t) => t.status === 'em_progresso');
  let nextDirective: HomeSummary['nextDirective'] = null;
  if (role === 'super_admin' || role === 'moderador') {
    nextDirective = { label: 'Aprovar perfis pendentes', to: '/app/admin/aprovacoes', type: 'review', description: 'Perfis aguardam aprovação' };
  } else if (inProgressInscricao?.curso) {
    nextDirective = { label: `Continua "${inProgressInscricao.curso.titulo ?? 'o curso'}"`, to: `/app/cursos/${String(inProgressInscricao.curso.id)}`, type: 'learning', description: `${String(inProgressInscricao.progressoPercentual ?? 0)}% concluído` };
  } else if (inProgressTentativa?.simulacao) {
    nextDirective = { label: `Retoma "${inProgressTentativa.simulacao.titulo ?? 'simulação'}"`, to: `/app/simulacoes/${String(inProgressTentativa.simulacao.id)}`, type: 'learning', description: 'Simulação em progresso' };
  }

  const quickActions = QUICK_ACTIONS_BY_ROLE[role] ?? QUICK_ACTIONS_BY_ROLE['estudante'] ?? [];

  return {
    greeting: `Olá, ${nomePerfil}!`,
    personalizedMessage: 'Bem-vindo de volta à tua plataforma de desenvolvimento.',
    stats: {
      xp: perfil?.xp ?? 0,
      reputacao: perfil?.reputacao ?? 0,
      conquistasCount: perfil?.conquistasCount ?? 0,
      pendingActions: 0,
    },
    nextDirective,
    socialPulse: [],
    quickActions,
    recentActivitiesCursos,
    recentActivitiesSimulacoes,
    onboardingVideo,
    trendingComunidade,
    aprenderAgora,
  };
}

// ── GET / ────────────────────────────────────────────────────────────────────

homeRoutes.get('/', verifyJwt, async (c) => {
  const user = c.get('user');
  const cacheKey = `home:summary:${user.id}`;

  let redisAvailable = true;
  try {
    const cached = await redis.get<HomeSummary>(cacheKey);
    if (cached) {
      return c.json(cached);
    }
  } catch (err) {
    redisAvailable = false;
    log.warn({ err, userId: user.id }, 'home: Redis indisponível — computando direto');
  }

  let summary: HomeSummary;
  try {
    summary = await computeHomeSummary(user.id, user.role);
  } catch (err) {
    log.warn({ err, userId: user.id }, 'home: Strapi indisponível');
    return c.json({ error: 'Serviço temporariamente indisponível' }, 502);
  }

  if (redisAvailable) {
    try {
      await redis.set(cacheKey, summary, { ex: 60 });
    } catch (err) {
      log.warn({ err, userId: user.id }, 'home: falha ao escrever cache Redis');
    }
  }

  return c.json(summary);
});
