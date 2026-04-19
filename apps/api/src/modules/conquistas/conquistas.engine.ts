import pino from 'pino';
import { strapiGet, strapiPost } from '../strapi/strapi.client.js';
import { featureFlagService } from '../feature-flags/feature-flags.service.js';

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
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function countTelemetria(userId: string, tipo: string): Promise<number> {
  try {
    const res = await strapiGet<StrapiCountMeta>('/telemetrias', {
      'pagination[pageSize]': '1',
      'filters[user][$eq]': userId,
      'filters[tipo][$eq]': tipo,
    });
    return res.meta?.pagination?.total ?? 0;
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

// ── Declarative rules (10+) ─────────────────────────────────────────────────

export const REGRAS: readonly ConquistaRule[] = [
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
    return (res.meta?.pagination?.total ?? 0) > 0;
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
  const conquistaId = conquistaRes.data?.id;
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
): Promise<UnlockedConquista[]> {
  // Feature-flag gate
  try {
    const flags = await featureFlagService.getEffectiveFlags();
    if (!flags['AUTO_ACHIEVEMENTS']) return [];
  } catch {
    return [];
  }

  const matchingRules = REGRAS.filter((r) => r.trigger === evento);
  if (matchingRules.length === 0) return [];

  const unlocked: UnlockedConquista[] = [];

  for (const rule of matchingRules) {
    try {
      // Idempotency — already unlocked?
      if (await isAlreadyUnlocked(userId, rule.slug)) continue;

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
