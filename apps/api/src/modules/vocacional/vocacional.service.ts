import {
  type PerfilVocacional,
  type CertezaVocacional,
  type Curso,
  type BehaviorPattern,
  type PerfilCompleto,
  AreaVocacionalSchema,
} from '@pdc/shared';
import { type Recomendacao } from './vocacional.types.js';
import { strapiGet } from '../strapi/strapi.client.js';
import pino from 'pino';

const log = pino({ name: 'vocacional-service' });

// ── Pesos canónicos (Spec 1a81656f) ──────────────────────────────────────────

interface TentativaStrapiRecord {
  id: string;
  score: number;
  status: string;
}

interface TelemetriaCountMeta {
  data: unknown[];
  meta: { pagination: { total: number } };
}

async function countTelemetria(perfilId: string, tipo: string): Promise<number> {
  try {
    const res = await strapiGet<TelemetriaCountMeta>('/telemetrias', {
      'pagination[pageSize]': '1',
      'filters[perfil][id][$eq]': perfilId,
      'filters[tipo][$eq]': tipo,
    });
    return res.meta.pagination.total;
  } catch (err) {
    log.warn({ perfilId, tipo, err }, 'countTelemetria: falha ao contar telemetria');
    return 0;
  }
}

async function fetchTentativas(perfilId: string, status: string, limit = 50): Promise<TentativaStrapiRecord[]> {
  try {
    const res = await strapiGet<TentativaStrapiRecord>('/tentativas', {
      'filters[perfil][id][$eq]': perfilId,
      'filters[status][$eq]': status,
      'fields[0]': 'id',
      'fields[1]': 'score',
      'fields[2]': 'status',
      'pagination[pageSize]': String(limit),
      'sort': 'createdAt:desc',
    });
    return res.data;
  } catch (err) {
    log.warn({ perfilId, status, err }, 'fetchTentativas: falha ao buscar tentativas');
    return [];
  }
}

async function calcularScoreEventos(perfilId: string): Promise<{ score: number; totalEventos: number }> {
  // Fetch in parallel for performance
  const [tentativasConcluidas, tentativasAbandonadas, ...counts] = await Promise.all([
    fetchTentativas(perfilId, 'concluida', 50),
    fetchTentativas(perfilId, 'cancelada', 50),
    countTelemetria(perfilId, 'curso.concluido'),
    countTelemetria(perfilId, 'curso.inscricao'),
    countTelemetria(perfilId, 'experiencia.visualizada'),
    countTelemetria(perfilId, 'questao.respondida'),
    countTelemetria(perfilId, 'projeto.criado'),
    countTelemetria(perfilId, 'projeto.publicado'),
    countTelemetria(perfilId, 'mentoria.aceite'),
    countTelemetria(perfilId, 'conquista.partilhada'),
    countTelemetria(perfilId, 'rating.criado'),
  ]);

  const [
    cursoConcluido,
    cursoInscricao,
    experienciaVisualizada,
    questaoRespondida,
    projetoCriado,
    projetoPublicado,
    mentoriaAceite,
    conquistaPartilhada,
    ratingCriado,
  ] = counts;

  // simulacao.concluida: 40pts × (score/100) — usa score real da tentativa
  const ptsTentativasConcluidas = tentativasConcluidas.reduce((sum, t) => {
    const normalizedScore = Math.min(1, Math.max(0, t.score / 100));
    return sum + 40 * normalizedScore;
  }, 0);

  // simulacao.abandonada: -5pts por ocorrência (cap at -20 to avoid excessive penalty)
  const ptsAbandonadas = Math.max(-20, tentativasAbandonadas.length * -5);

  const rawScore =
    ptsTentativasConcluidas +
    ptsAbandonadas +
    cursoConcluido * 30 +
    cursoInscricao * 5 +
    experienciaVisualizada * 3 +
    // questao.respondida: spec assumes mixed acerto — apply flat 8×1.0 (50% acerto avg)
    questaoRespondida * 8 +
    projetoCriado * 15 +
    projetoPublicado * 20 +
    mentoriaAceite * 10 +
    conquistaPartilhada * 5 +
    ratingCriado * 2;

  const totalEventos =
    tentativasConcluidas.length +
    tentativasAbandonadas.length +
    cursoConcluido +
    cursoInscricao +
    experienciaVisualizada +
    questaoRespondida +
    projetoCriado +
    projetoPublicado +
    mentoriaAceite +
    conquistaPartilhada +
    ratingCriado;

  return {
    score: Math.min(100, Math.max(0, Math.round(rawScore))),
    totalEventos,
  };
}

function calcularCerteza(totalEventos: number, patternsCount: number): CertezaVocacional {
  if (totalEventos >= 50 && patternsCount >= 3) return 'ALTA';
  if (totalEventos >= 15 || patternsCount >= 1) return 'MEDIA';
  return 'BAIXA';
}

async function calcularPerfil(userId: string): Promise<PerfilVocacional> {
  const [resPerfil, resPatterns] = await Promise.all([
    strapiGet<PerfilCompleto>('/perfis', {
      'filters[userId][$eq]': userId,
      'fields[0]': 'id',
      'fields[1]': 'xp',
      'fields[2]': 'areaInteresse'
    }),
    strapiGet<BehaviorPattern>('/behavior-patterns', {
      'filters[perfil][userId][$eq]': userId,
      'sort': 'lastUpdatedAt:desc'
    })
  ]);

  const perfil = resPerfil.data[0];
  const patterns = resPatterns.data;

  if (!perfil) {
    throw new Error('Perfil não encontrado para cálculo vocacional');
  }

  // Event-weight score (spec 1a81656f) — primary score signal
  const { score: scoreEventos, totalEventos } = await calcularScoreEventos(perfil.id);

  // Behavior patterns — dimensões do perfil (φ, R, Focus, Hesitação)
  const defaultDim = { fluidez: 5, resiliencia: 5, foco: 5, hesitacao: 2 };
  const dimensoes = patterns.length > 0 ? {
    fluidez: patterns.reduce((acc, p) => acc + p.cognitiveFluidity, 0) / patterns.length,
    resiliencia: patterns.reduce((acc, p) => acc + p.resilienceIndex, 0) / patterns.length,
    foco: patterns.reduce((acc, p) => acc + p.focusStability, 0) / patterns.length,
    hesitacao: patterns.reduce((acc, p) => acc + p.hesitationIndex, 0) / patterns.length,
  } : defaultDim;

  // scoreGlobal: event-weight score (70%) + behavior pattern bonus (30%)
  const behaviorBonus = patterns.length > 0
    ? ((dimensoes.fluidez + dimensoes.resiliencia + dimensoes.foco + (10 - dimensoes.hesitacao)) / 4) * 3
    : 0;
  const scoreGlobal = Math.min(100, Math.round(scoreEventos * 0.7 + behaviorBonus));

  const certeza = calcularCerteza(totalEventos, patterns.length);

  const parsedArea = AreaVocacionalSchema.safeParse(patterns[0]?.domainId ?? perfil.areaInteresse);
  const areaMatch = parsedArea.success ? parsedArea.data : 'TECNOLOGIA';
  const now = new Date().toISOString();

  return {
    id: perfil.id,
    perfilId: perfil.id,
    scoreGlobal,
    certeza,
    totalEventos,
    areaMatch,
    aptidao: scoreEventos / 100,
    dedicacao: Math.min(1, perfil.xp / 10000),
    createdAt: now,
    updatedAt: now,
    dimensoes: {
      fluidez: dimensoes.fluidez,
      resiliencia: dimensoes.resiliencia,
      foco: dimensoes.foco,
      hesitacao: dimensoes.hesitacao,
    },
  };
}

async function gerarRecomendacoes(perfil: PerfilVocacional | null): Promise<Recomendacao[]> {
  if (!perfil) return [];

  const res = await strapiGet<Curso>('/cursos', {
    'filters[area][$eq]': perfil.areaMatch,
    'pagination[pageSize]': '3',
    'sort': 'createdAt:desc',
  });

  return res.data.map((curso) => {
    const diff = Math.abs(perfil.scoreGlobal - curso.rating * 20);
    const matchPercentagem = Math.max(70, 100 - diff);

    return {
      id: curso.id,
      titulo: curso.titulo,
      tipo: 'curso',
      matchPercentagem: Math.round(matchPercentagem),
      motivo: `A tua assinatura biométrica em ${perfil.areaMatch} demonstra prontidão para este desafio.`
    };
  });
}

export const vocacionalService = {
  calcularPerfil,
  gerarRecomendacoes,
};
