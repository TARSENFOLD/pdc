import { 
  type PerfilVocacional, 
  type Curso, 
  type BehaviorPattern, 
  type PerfilCompleto 
} from '@pdc/shared';
import { type Recomendacao } from './vocacional.types.js';
import { strapiGet } from '../strapi/strapi.client.js';

async function calcularPerfil(userId: string): Promise<PerfilVocacional> {
  // 1. Buscar Perfil e Padrões Behaviorais reais
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

  // 2. Agregação de Dimensões (Cálculo Soberano)
  const defaultDim = { fluidez: 5, resiliencia: 5, foco: 5, hesitacao: 2 };
  
  const dimensoes = patterns.length > 0 ? {
    fluidez: patterns.reduce((acc, p) => acc + p.cognitiveFluidity, 0) / patterns.length,
    resiliencia: patterns.reduce((acc, p) => acc + p.resilienceIndex, 0) / patterns.length,
    foco: patterns.reduce((acc, p) => acc + p.focusStability, 0) / patterns.length,
    hesitacao: patterns.reduce((acc, p) => acc + p.hesitationIndex, 0) / patterns.length,
  } : defaultDim;

  // 3. Score Global (XP + Média Behavior)
  const behaviorAvg = (dimensoes.fluidez + dimensoes.resiliencia + dimensoes.foco + (10 - dimensoes.hesitacao)) / 4;
  const xpFactor = Math.min(10, (perfil.xp || 0) / 1000);
  const scoreGlobal = Math.round((behaviorAvg * 0.7 + xpFactor * 3) * 10);
  
  // 4. Identificação de Área por afinidade real
  const areaMatch = patterns[0]?.domainId || perfil.areaInteresse || 'TECNOLOGIA';

  return {
    estudanteId: userId,
    scoreGlobal: Math.min(100, scoreGlobal),
    areaMatch,
    certeza: patterns.length > 3 ? 0.9 : 0.6,
    aptidao: behaviorAvg / 10,
    dedicacao: Math.min(1, (perfil.xp || 0) / 10000),
    consistencia: 1 - (dimensoes.hesitacao / 10),
    diversidade: new Set(patterns.map(p => p.domainId)).size / 5,
    updatedAt: new Date().toISOString(),
    dimensoes
  };
}

async function gerarRecomendacoes(perfil: PerfilVocacional | null): Promise<Recomendacao[]> {
  if (!perfil) return [];

  // Busca cursos na área de afinidade do estudante
  const res = await strapiGet<Curso>('/cursos', {
    'filters[area][$eq]': perfil.areaMatch,
    'pagination[limit]': '3',
    'sort': 'rating:desc'
  });
  
  return res.data.map((curso) => {
    // Cálculo de match determinístico baseado no score do estudante vs nível do curso
    const diff = Math.abs(perfil.scoreGlobal - (curso.rating || 0) * 20);
    const matchPercentagem = Math.max(70, 100 - diff);

    return {
      id: String(curso.id),
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
