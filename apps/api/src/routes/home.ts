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
import { cursosService } from '../modules/cursos/cursos.service.js';
import { loadSimulacaoVersions } from '../modules/simulacoes/simulacao-access.repository.js';
import {
  CONTENT_ACCESS_ERRORS,
  canReadResolvedPublicContent,
  isUnavailableContentState,
  parseContentState,
} from '../modules/conteudo/content-access.service.js';

const log = pino({ name: 'routes:home' });

type Vars = { Variables: AuthVariables };
export const homeRoutes = new Hono<Vars>();

// ── Strapi shape interfaces ──────────────────────────────────────────────────

interface PerfilStats {
  id: string | number;
  xp?: number;
  reputacao?: number;
  conquistasCount?: number;
  vinkulosCount?: number;
  activeStudents?: number;
  activePrograms?: number;
  nome?: string;
}

interface InscricaoRaw {
  id: string | number;
  progressoPercentual?: number;
  ultimaAtividadeEm?: string;
  createdAt?: string;
  curso?: {
    id: string | number;
    documentId?: string;
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
    documentId?: string;
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
const HOME_TRENDING_CANDIDATE_LIMIT = 10;

class HiddenContentRelationError extends Error {
  constructor() {
    super('Relação existente aponta para conteúdo indisponível');
    this.name = 'HiddenContentRelationError';
  }
}

function contentIdentifier(relation: { id: string | number; documentId?: string }): string {
  return relation.documentId ?? String(relation.id);
}

function cachedHomeHasGovernedContent(summary: HomeSummary): boolean {
  return summary.recentActivitiesCursos.length > 0
    || summary.recentActivitiesSimulacoes.length > 0
    || summary.aprenderAgora.length > 0
    || summary.nextDirective?.type === 'learning';
}

// ── Quick Actions por role (BFF SSOT — INV-B2: 5 botões) ─────────────────────

type QuickActionItem = { label: string; to: string; icon: string; variant: 'primary' | 'secondary' | 'ghost' };
const QUICK_ACTIONS_BY_ROLE: Record<string, QuickActionItem[]> = {
  estudante: [
    { label: 'Experiências', to: '/app/explorar',               icon: 'Compass',      variant: 'primary' },
    { label: 'Simulações',   to: '/app/simulacoes',             icon: 'FlaskConical', variant: 'secondary' },
    { label: 'Cursos',       to: '/app/cursos',                 icon: 'BookOpen',     variant: 'secondary' },
    { label: 'Projectos',    to: '/app/explorar',               icon: 'FolderKanban', variant: 'secondary' },
    { label: 'Perfil',       to: '/app/dashboard/estudante',   icon: 'User',         variant: 'secondary' },
  ],
  mentor: [
    { label: 'Simulações',  to: '/app/mentor/simulacoes',      icon: 'FlaskConical',  variant: 'primary' },
    { label: 'Programas',   to: '/app/instituicao/programas',  icon: 'GraduationCap', variant: 'secondary' },
    { label: 'Cursos',      to: '/app/mentor/cursos',          icon: 'BookOpen',      variant: 'secondary' },
    { label: 'Explorar',    to: '/app/explorar',               icon: 'Compass',       variant: 'secondary' },
    { label: 'Dashboard',   to: '/app/dashboard/mentor',       icon: 'BarChart2',     variant: 'secondary' },
  ],
  instituicao: [
    { label: 'Programas', to: '/app/instituicao/programas', icon: 'GraduationCap', variant: 'primary' },
    { label: 'Experiências', to: '/app/instituicao/experiencias', icon: 'BookOpen', variant: 'secondary' },
    { label: 'Projecto', to: '/app/explorar', icon: 'FolderKanban', variant: 'secondary' },
    { label: 'Feed', to: '/app/feed', icon: 'Zap', variant: 'secondary' },
    { label: 'Relatórios', to: '/app/dashboard/instituicao', icon: 'BarChart2', variant: 'secondary' },
  ],
  moderador: [
    { label: 'Aprovações', to: '/app/moderacao/aprovacoes', icon: 'CheckCircle', variant: 'primary' },
    { label: 'Moderação', to: '/app/moderacao', icon: 'Shield', variant: 'secondary' },
    { label: 'Simulações', to: '/app/simulacoes', icon: 'FlaskConical', variant: 'secondary' },
    { label: 'Feed', to: '/app/feed', icon: 'Zap', variant: 'secondary' },
    { label: 'Dashboard', to: '/app/dashboard/moderador', icon: 'BarChart2', variant: 'secondary' },
  ],
  super_admin: [
    { label: 'Aprovações', to: '/app/moderacao/aprovacoes', icon: 'CheckCircle', variant: 'primary' },
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
      'fields': 'xp,reputacao,conquistasCount,vinkulosCount,activeStudents,activePrograms,nome',
    }),
    strapiGet<InscricaoRaw>('/inscricoes', {
      'filters[perfil][userId][$eq]': userId,
      'sort': 'ultimaAtividadeEm:desc',
      'pagination[pageSize]': '2',
      'populate': 'curso',
    }),
    strapiGet<TentativaRaw>('/tentativas', {
      'filters[perfil][userId][$eq]': userId,
      'sort': 'dataInicio:desc',
      'pagination[pageSize]': '2',
      'populate': 'simulacao',
    }),
    strapiGet<OnboardingVideoRaw>('/onboarding-videos', {
      'filters[role][$eq]': role,
      'pagination[pageSize]': '1',
    }),
    fetchCandidates(),
  ]);

  const visibleInscricoes = (await Promise.all(inscricoesRes.data.map(async (inscricao) => {
    if (!inscricao.curso) return undefined;
    const versions = await cursosService.obterVersoesCurso(contentIdentifier(inscricao.curso));
    const currentState = parseContentState((versions.current ?? versions.published)?.estado);
    if (isUnavailableContentState(currentState)) throw new HiddenContentRelationError();
    return canReadResolvedPublicContent({
      currentState,
      publishedState: parseContentState(versions.published?.estado),
      hasPublishedVersion: versions.published !== undefined,
    }) ? inscricao : undefined;
  }))).filter((inscricao): inscricao is InscricaoRaw & { id: string | number } => inscricao !== undefined);

  const visibleTentativas = (await Promise.all(tentativasRes.data.map(async (tentativa) => {
    if (!tentativa.simulacao) return undefined;
    const versions = await loadSimulacaoVersions(contentIdentifier(tentativa.simulacao));
    const currentState = parseContentState((versions.current ?? versions.published)?.estado);
    if (isUnavailableContentState(currentState)) throw new HiddenContentRelationError();
    return canReadResolvedPublicContent({
      currentState,
      publishedState: parseContentState(versions.published?.estado),
      hasPublishedVersion: versions.published !== undefined,
    }) ? tentativa : undefined;
  }))).filter((tentativa): tentativa is TentativaRaw & { id: string | number } => tentativa !== undefined);

  const perfil = perfilRes.data[0];

  const recentActivitiesCursos: InscricaoActivity[] = visibleInscricoes.flatMap((i) => {
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

  const recentActivitiesSimulacoes: TentativaActivity[] = visibleTentativas.flatMap((t) => {
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

  function recentFirst(a: StrapiEntity, b: StrapiEntity): number {
    const dateA = Date.parse(a.publishedAt ?? a.createdAt);
    const dateB = Date.parse(b.publishedAt ?? b.createdAt);
    const safeA = Number.isFinite(dateA) ? dateA : 0;
    const safeB = Number.isFinite(dateB) ? dateB : 0;
    return safeB - safeA;
  }

  async function scoreAndMap(items: Array<StrapiEntity & { tipo: FeedItemTipo }>): Promise<TrendingItem[]> {
    const candidatesForHome = [...items]
      .sort(recentFirst)
      .slice(0, HOME_TRENDING_CANDIDATE_LIMIT);
    const scored = await mapConcurrent(
      candidatesForHome,
      async (cand) => {
        const stats = await getItemStats(cand.tipo, String(cand.id));
        const recencyScore = calcRecencyScore(cand.publishedAt ?? cand.createdAt, cand.tipo);
        const features = buildFeatures(stats, recencyScore, 0, 0);
        const rawScore = calcScore(features, weights);
        const score = Number.isFinite(rawScore) ? rawScore : 0;
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
  const inProgressInscricao = visibleInscricoes.find(
    (i) => i.progressoPercentual != null && i.progressoPercentual > 0 && i.progressoPercentual < 100
  );
  const inProgressTentativa = visibleTentativas.find((t) => t.status === 'em_progresso');
  let nextDirective: HomeSummary['nextDirective'] = null;
  if (role === 'super_admin' || role === 'moderador') {
    nextDirective = { label: 'Rever conteúdos pendentes', to: '/app/moderacao/aprovacoes', type: 'review', description: 'Conteúdos aguardam moderação' };
  } else if (inProgressInscricao?.curso) {
    nextDirective = { label: `Continua "${inProgressInscricao.curso.titulo ?? 'o curso'}"`, to: `/app/cursos/${String(inProgressInscricao.curso.id)}`, type: 'learning', description: `${String(inProgressInscricao.progressoPercentual ?? 0)}% concluído` };
  } else if (inProgressTentativa?.simulacao) {
    nextDirective = { label: `Retoma "${inProgressTentativa.simulacao.titulo ?? 'simulação'}"`, to: `/app/simulacoes/${String(inProgressTentativa.simulacao.id)}`, type: 'learning', description: 'Simulação em progresso' };
  } else if (role === 'estudante') {
    nextDirective = { label: 'Descobre a tua primeira Experiência', to: '/app/explorar', type: 'onboarding', description: 'Explora áreas antes de decidir o teu percurso' };
  } else if (role === 'mentor' || role === 'instituicao') {
    nextDirective = { label: 'Completa o teu perfil de mentor', to: '/app/dashboard/mentor', type: 'onboarding', description: 'Um perfil completo atrai mais estudantes' };
  }

  const quickActions = QUICK_ACTIONS_BY_ROLE[role] ?? QUICK_ACTIONS_BY_ROLE['estudante'] ?? [];

  return {
    greeting: `Olá, ${nomePerfil}!`,
    personalizedMessage: 'Bem-vindo de volta à tua plataforma de desenvolvimento.',
    stats: {
      xp: perfil?.xp ?? 0,
      reputacao: perfil?.reputacao ?? 0,
      conquistasCount: perfil?.conquistasCount ?? 0,
      vinkulosCount: perfil?.vinkulosCount ?? 0,
      activeStudents: perfil?.activeStudents ?? 0,
      activePrograms: perfil?.activePrograms ?? 0,
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
  const cacheKey = `home:summary:v2:${user.id}`;

  let redisAvailable = true;
  try {
    const cached = await redis.get<HomeSummary>(cacheKey);
    if (cached && !cachedHomeHasGovernedContent(cached)) {
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
    if (err instanceof HiddenContentRelationError) {
      return c.json(CONTENT_ACCESS_ERRORS.content_not_available, 409);
    }
    return c.json(CONTENT_ACCESS_ERRORS.dependency_unavailable, 503);
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
