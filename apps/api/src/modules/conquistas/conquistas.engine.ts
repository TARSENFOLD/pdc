import pino from 'pino';
import { strapiGet, strapiPost } from '../strapi/strapi.client.js';
import { featureFlagService } from '../feature-flags/feature-flags.service.js';
import { DomainEventName } from '../events/types.js';

const log = pino({ name: 'conquistas-engine' });

// ── Strapi types ────────────────────────────────────────────────────────────

interface StrapiCountMeta {
  data: unknown[];
  meta: { pagination: { total: number } };
}

interface StrapiConquistaRecord {
  id: number;
  documentId?: string;
}

interface StrapiPerfilRecord {
  id: number;
  documentId?: string;
  userId?: string;
  reputacao?: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function countTelemetria(userId: string, tipo: string): Promise<number> {
  try {
    const res = await strapiGet<StrapiCountMeta>('/telemetrias', {
      'pagination[pageSize]': '1',
      'filters[user][$eq]': userId,
      'filters[tipo][$eq]': tipo,
    });
    return res.meta.pagination.total;
  } catch {
    return 0;
  }
}

// ── Rule types ──────────────────────────────────────────────────────────────

interface ConquistaRule {
  slug: string;
  trigger: string;
  titulo: string;
  descricao: string;
  dependencies?: string[]; // Slugs de conquistas necessárias
  condition: (userId: string, referencia?: string) => Promise<boolean>;
}

function thresholdCondition(
  tipo: string,
  threshold: number,
): (userId: string) => Promise<boolean> {
  return async (userId) => {
    const count = await countTelemetria(userId, tipo);
    return count >= threshold;
  };
}

// ── Strategy A: DomainEventName → trigger string mapping (ADR-008.bis) ─────
export const EVENT_TO_TRIGGER_MAP: Readonly<Record<string, string>> = {
  [DomainEventName.TENTATIVA_CONCLUIDA]:        'simulacao.concluida',
  [DomainEventName.CURSO_CONCLUIDO]:            DomainEventName.CURSO_CONCLUIDO,
  [DomainEventName.VINCULO_CONNECTED]:          DomainEventName.VINCULO_CONNECTED,
  [DomainEventName.LOGIN]:                      DomainEventName.LOGIN,
  [DomainEventName.MENTORIA_ACEITE]:            DomainEventName.MENTORIA_ACEITE,
  [DomainEventName.EXPERIENCIA_PUBLICADA]:      DomainEventName.EXPERIENCIA_PUBLICADA,
  [DomainEventName.RATING_CRIADO]:              DomainEventName.RATING_CRIADO,
  [DomainEventName.PERFIL_ATUALIZADO]:          DomainEventName.PERFIL_ATUALIZADO,
  [DomainEventName.SIMULACAO_CRIADA]:           DomainEventName.SIMULACAO_CRIADA,
  [DomainEventName.CURSO_PUBLICADO]:            DomainEventName.CURSO_PUBLICADO,
  [DomainEventName.CURSO_INSCRICAO]:            DomainEventName.CURSO_INSCRICAO,
  [DomainEventName.COMENTARIO_CRIADO]:          DomainEventName.COMENTARIO_CRIADO,
  [DomainEventName.PROJETO_PUBLICADO]:          DomainEventName.PROJETO_PUBLICADO,
  [DomainEventName.PROGRAMA_APROVADO]:          DomainEventName.PROGRAMA_APROVADO,
  [DomainEventName.PROGRAMA_CONCLUIDO]:         DomainEventName.PROGRAMA_CONCLUIDO,
  [DomainEventName.PROJETO_ENDORSEMENT_RECEBIDO]: DomainEventName.PROJETO_ENDORSEMENT_RECEBIDO,
  [DomainEventName.PROJETO_ACESSO_CONCEDIDO]:   DomainEventName.PROJETO_ACESSO_CONCEDIDO,
  [DomainEventName.COMITE_APROVOU]:             DomainEventName.COMITE_APROVOU,
  [DomainEventName.LIKE_ADICIONADO]:            DomainEventName.LIKE_ADICIONADO,
} as const;

// ── Declarative rules (25+) ─────────────────────────────────────────────────

export const REGRAS: readonly ConquistaRule[] = [
  {
    slug: 'primeira-simulacao',
    trigger: 'simulacao.concluida',
    titulo: 'Primeira Simulação',
    descricao: 'Completou a sua primeira simulação vocacional',
    condition: thresholdCondition('simulacao.concluida', 1),
  },
  {
    slug: 'explorador-vocacional',
    trigger: 'simulacao.concluida',
    titulo: 'Explorador Vocacional',
    descricao: 'Completou 3 simulações vocacionais',
    condition: thresholdCondition('simulacao.concluida', 3),
  },
  {
    slug: 'conclusao-de-curso',
    trigger: 'curso.concluido',
    titulo: 'Conclusão de Curso',
    descricao: 'Concluiu um curso por completo',
    condition: thresholdCondition('curso.concluido', 1),
  },
  {
    slug: 'rede-em-crescimento',
    trigger: 'vinculo.connected',
    titulo: 'Rede em Crescimento',
    descricao: 'Estabeleceu 5 vínculos na plataforma',
    condition: thresholdCondition('vinculo.connected', 5),
  },
  {
    slug: 'perfil-completo',
    trigger: 'perfil.atualizado',
    titulo: 'Perfil Completo',
    descricao: 'Preencheu o perfil pela primeira vez',
    condition: thresholdCondition('perfil.atualizado', 1),
  },
  {
    slug: 'assiduidade-exemplar',
    trigger: 'login',
    titulo: 'Assiduidade Exemplar',
    descricao: 'Fez login 7 vezes na plataforma',
    condition: thresholdCondition('login', 7),
  },
  {
    slug: 'primeiro-curso',
    trigger: 'curso.publicado',
    titulo: 'Primeiro Curso',
    descricao: 'Publicou o primeiro curso na plataforma',
    condition: thresholdCondition('curso.publicado', 1),
  },
  {
    slug: 'simulador-iniciante',
    trigger: 'simulacao.criada',
    titulo: 'Simulador Iniciante',
    descricao: 'Criou a primeira simulação vocacional',
    condition: thresholdCondition('simulacao.criada', 1),
  },
  {
    slug: 'critico-construtivo',
    trigger: 'rating.criado',
    titulo: 'Crítico Construtivo',
    descricao: 'Deu a primeira avaliação na plataforma',
    condition: thresholdCondition('rating.criado', 1),
  },
  {
    slug: 'participante-ativo',
    trigger: 'comentario.criado',
    titulo: 'Participante Ativo',
    descricao: 'Criou 10 comentários em cursos ou simulações',
    condition: thresholdCondition('comentario.criado', 10),
  },
  {
    slug: 'mentor-dedicado',
    trigger: 'mentoria.aceite',
    titulo: 'Mentor Dedicado',
    descricao: 'Aceitou a primeira sessão de mentoria',
    condition: thresholdCondition('mentoria.aceite', 1),
  },
  {
    slug: 'partilha-de-experiencia',
    trigger: 'experiencia.publicada',
    titulo: 'Partilha de Experiência',
    descricao: 'Publicou a primeira experiência profissional',
    condition: thresholdCondition('experiencia.publicada', 1),
  },
  {
    slug: 'estudante-curioso',
    trigger: 'curso.inscricao',
    titulo: 'Estudante Curioso',
    descricao: 'Inscreveu-se em 5 cursos diferentes',
    condition: thresholdCondition('curso.inscricao', 5),
  },
  // Novas regras G15-T6
  {
    slug: 'primeiro-projeto',
    trigger: DomainEventName.PROJETO_PUBLICADO,
    titulo: 'Primeiro Projeto',
    descricao: 'Publicou o seu primeiro projeto no Hub',
    condition: thresholdCondition(DomainEventName.PROJETO_PUBLICADO, 1),
  },
  {
    slug: 'tier-prata-alcancado',
    trigger: DomainEventName.PERFIL_ATUALIZADO,
    titulo: 'Nível Prata',
    descricao: 'Alcançou o Tier Prata de reputação',
    condition: async (userId) => {
      const pId = await getPerfilId(userId);
      if (!pId) return false;
      const res = await strapiGet<StrapiPerfilRecord>(`/perfis/${String(pId)}`, { 'fields[0]': 'reputacao' });
      return (res.data[0]?.reputacao ?? 0) >= 40;
    }
  },
  {
    slug: 'tier-ouro-alcancado',
    trigger: DomainEventName.PERFIL_ATUALIZADO,
    titulo: 'Nível Ouro',
    descricao: 'Alcançou o Tier Ouro de reputação',
    dependencies: ['tier-prata-alcancado'],
    condition: async (userId) => {
      const pId = await getPerfilId(userId);
      if (!pId) return false;
      const res = await strapiGet<StrapiPerfilRecord>(`/perfis/${String(pId)}`, { 'fields[0]': 'reputacao' });
      return (res.data[0]?.reputacao ?? 0) >= 70;
    }
  },
  {
    slug: 'tier-diamante-alcancado',
    trigger: DomainEventName.PERFIL_ATUALIZADO,
    titulo: 'Nível Diamante',
    descricao: 'Alcançou o Tier Diamante de reputação',
    dependencies: ['tier-ouro-alcancado'],
    condition: async (userId) => {
      const pId = await getPerfilId(userId);
      if (!pId) return false;
      const res = await strapiGet<StrapiPerfilRecord>(`/perfis/${String(pId)}`, { 'fields[0]': 'reputacao' });
      return (res.data[0]?.reputacao ?? 0) >= 90;
    }
  },
  {
    slug: 'programa-completo',
    trigger: DomainEventName.PROGRAMA_CONCLUIDO,
    titulo: 'Programa Concluído',
    descricao: 'Participou e concluiu um programa institucional',
    condition: thresholdCondition(DomainEventName.PROGRAMA_CONCLUIDO, 1),
  },
  {
    slug: 'streak-7-dias',
    trigger: DomainEventName.LOGIN,
    titulo: 'Assiduidade de Ferro',
    descricao: 'Fez login 7 dias seguidos na plataforma',
    condition: async (userId) => {
      // Simplificado: usa totalEventos como proxy se não tivermos streak real ainda
      const count = await countTelemetria(userId, 'login');
      return count >= 15;
    }
  },
  {
    slug: 'primeiro-endorsement',
    trigger: DomainEventName.PROJETO_ENDORSEMENT_RECEBIDO,
    titulo: 'Talento Reconhecido',
    descricao: 'Recebeu o seu primeiro endorsement num projeto',
    condition: thresholdCondition(DomainEventName.PROJETO_ENDORSEMENT_RECEBIDO, 1),
  },
  {
    slug: 'mentor-elite',
    trigger: DomainEventName.MENTORIA_ACEITE,
    titulo: 'Mentor de Elite',
    descricao: 'Aceitou e completou 10 sessões de mentoria',
    condition: thresholdCondition('mentoria.aceite', 10),
  },
  {
    slug: 'feedback-comite',
    trigger: DomainEventName.COMITE_APROVOU,
    titulo: 'Selo Científico',
    descricao: 'Recebeu feedback positivo do Comité Científico',
    condition: thresholdCondition(DomainEventName.COMITE_APROVOU, 1),
  },
  {
    slug: 'colaborador-projeto',
    trigger: DomainEventName.PROJETO_ACESSO_CONCEDIDO,
    titulo: 'Colaborador Ativo',
    descricao: 'Foi aceite como colaborador num projeto alheio',
    condition: thresholdCondition(DomainEventName.PROJETO_ACESSO_CONCEDIDO, 1),
  },
  {
    slug: 'autoridade-em-area',
    trigger: DomainEventName.CURSO_PUBLICADO,
    titulo: 'Autoridade de Área',
    descricao: 'Publicou 5 cursos na mesma área vocacional',
    condition: thresholdCondition('curso.publicado', 5),
  },
  {
    slug: 'viral-likes',
    trigger: DomainEventName.LIKE_ADICIONADO,
    titulo: 'Impacto Viral',
    descricao: 'Um dos seus posts ou projetos recebeu 100 likes',
    condition: () => Promise.resolve(false), // TODO: Implementar lógica de agregação por autor
  },
  {
    slug: 'mestre-da-experiencia',
    trigger: DomainEventName.EXPERIENCIA_PUBLICADA,
    titulo: 'Mestre da Experiência',
    descricao: 'Publicou 10 experiências profissionais validadas',
    condition: thresholdCondition('experiencia.publicada', 10),
  }
];

// ── Engine ──────────────────────────────────────────────────────────────────

export interface UnlockedConquista {
  slug: string;
  titulo: string;
  descricao: string;
}

/**
 * Check if a conquista has already been unlocked for this user.
 * Uses the conquistas collection (userId + slug) for stable identification.
 */
async function isAlreadyUnlocked(userId: string, slug: string): Promise<boolean> {
  try {
    const res = await strapiGet<StrapiCountMeta>('/conquistas', {
      'pagination[pageSize]': '1',
      'filters[userId][$eq]': userId,
      'filters[slug][$eq]': slug,
    });
    return res.meta.pagination.total > 0;
  } catch {
    return false;
  }
}

/**
 * Get perfil ID for a given Strapi user ID.
 */
async function getPerfilId(userId: string): Promise<number | null> {
  try {
    const res = await strapiGet<StrapiPerfilRecord>('/perfis', {
      'filters[userId][$eq]': userId,
      'pagination[pageSize]': '1',
      'fields[0]': 'id',
    });
    return res.data[0]?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Persist the unlock: create conquista record (for GET /minhas) and
 * conquista-utilizador junction record (AC requirement).
 */
async function unlock(userId: string, rule: ConquistaRule): Promise<void> {
  // 1. Create conquista record (so GET /conquistas/minhas picks it up)
  const conquistaRes = await strapiPost<StrapiConquistaRecord>(
    '/conquistas',
    {
      userId,
      slug: rule.slug,
      titulo: rule.titulo,
      descricao: rule.descricao,
      desbloqueada: true,
      tipo: 'automatica',
      evento: rule.trigger,
      data: new Date().toISOString(),
    },
  );

  // 2. Also create conquista-utilizador record (content-type existente)
  const conquistaId = conquistaRes.data.id;
  const perfilId = await getPerfilId(userId);

  if (conquistaId && perfilId) {
    try {
      await strapiPost('/conquista-utilizadors', {
        perfil: perfilId,
        conquista: conquistaId,
        desbloqueadaEm: new Date().toISOString(),
      });
    } catch (err: unknown) {
      log.warn({ err, userId, slug: rule.slug }, 'Falha ao criar conquista-utilizador (registo principal já criado)');
    }
  }
}

/**
 * Evaluate all rules for a given event and unlock matching conquistas.
 * Gated by AUTO_ACHIEVEMENTS feature flag.
 * Idempotent: same conquista is never unlocked twice for the same user.
 */
export async function verificarConquistas(
  userId: string,
  evento: string,
  referencia?: string,
  instituicaoId?: number,
): Promise<UnlockedConquista[]> {
  // Feature-flag gate — respeita overrides institucionais se disponíveis
  try {
    const flags = await featureFlagService.getEffectiveFlags(instituicaoId);
    if (!flags['AUTO_ACHIEVEMENTS']) return [];
  } catch {
    return [];
  }

  // Strategy A: resolve the canonical trigger string from the incoming event name.
  // This fixes the TENTATIVA_CONCLUIDA → 'simulacao.concluida' mismatch (T-FIX-3).
  const trigger = EVENT_TO_TRIGGER_MAP[evento] ?? evento;
  const matchingRules = REGRAS.filter((r) => r.trigger === trigger);
  if (matchingRules.length === 0) return [];

  const unlocked: UnlockedConquista[] = [];

  for (const rule of matchingRules) {
    try {
      // Idempotency — already unlocked?
      if (await isAlreadyUnlocked(userId, rule.slug)) continue;

      // Dependencies check
      if (rule.dependencies && rule.dependencies.length > 0) {
        const depChecks = await Promise.all(
          rule.dependencies.map(depSlug => isAlreadyUnlocked(userId, depSlug))
        );
        if (depChecks.some(passed => !passed)) continue;
      }

      // Evaluate condition
      const passes = await rule.condition(userId, referencia);
      if (!passes) continue;

      // Unlock
      await unlock(userId, rule);
      unlocked.push({
        slug: rule.slug,
        titulo: rule.titulo,
        descricao: rule.descricao,
      });

      log.info({ userId, slug: rule.slug }, 'Conquista desbloqueada');
    } catch (err: unknown) {
      log.error({ err, userId, slug: rule.slug }, 'Erro ao verificar/desbloquear conquista');
    }
  }

  return unlocked;
}

export const conquistaEngine = {
  verificarConquistas,
};
