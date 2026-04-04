import { strapiGet } from '../strapi/strapi.client.js';
import type { 
  Tentativa, 
  PerfilVocacional, 
  Curso
} from '@pdc/shared';

export const vocacionalService = {
  calcularPerfil: async (alunoId: string): Promise<PerfilVocacional> => {
    // Busca tentativas concluídas do aluno
    const response = await strapiGet<{ data: any[] }>('/tentativas', {
      'filters[alunoId][$eq]': alunoId,
      'filters[dataFim][$notNull]': 'true',
    });

    const tentativas = response.data.map(item => ({
      id: item.id.toString(),
      ...item.attributes,
    })) as Tentativa[];

    if (tentativas.length === 0) {
      return {
        alunoId,
        aptidao: 0,
        consistencia: 0,
        dedicacao: 0,
        diversidade: 0,
        scoreGlobal: 0,
        updatedAt: new Date().toISOString(),
      };
    }

    // 1. Aptidão (40%): Média dos scores (assumindo 0-10)
    const avgScore = tentativas.reduce((acc, t) => acc + (t.score || 0), 0) / tentativas.length;
    const aptidao = Math.min(10, avgScore);

    // 2. Consistência (20%): Baseada na variância (menor variância = maior consistência)
    const variance = tentativas.length > 1 
      ? tentativas.reduce((acc, t) => acc + Math.pow((t.score || 0) - avgScore, 2), 0) / tentativas.length
      : 0;
    const consistencia = Math.max(0, 10 - (variance * 2));

    // 3. Dedicação (20%): Volume de tentativas concluídas (meta: 5)
    const dedicacao = Math.min(10, (tentativas.length / 5) * 10);

    // 4. Diversidade (20%): Variedade de simulações diferentes realizadas
    const idsSimulacoes = new Set(tentativas.map(t => t.simulacaoId)).size;
    const diversidade = Math.min(10, (idsSimulacoes / 3) * 10);

    const scoreGlobal = (aptidao * 0.4) + (consistencia * 0.2) + (dedicacao * 0.2) + (diversidade * 0.2);

    return {
      alunoId,
      aptidao: Number(aptidao.toFixed(1)),
      consistencia: Number(consistencia.toFixed(1)),
      dedicacao: Number(dedicacao.toFixed(1)),
      diversidade: Number(diversidade.toFixed(1)),
      scoreGlobal: Number(scoreGlobal.toFixed(1)),
      updatedAt: new Date().toISOString(),
    };
  },

  gerarRecomendacoes: async (perfil: PerfilVocacional) => {
    // Busca cursos para recomendar (lógica simplificada para MVP)
    const response = await strapiGet<{ data: any[] }>('/cursos', {
      'pagination[pageSize]': '3',
    });

    const cursos = response.data.map(item => ({
      id: item.id.toString(),
      ...item.attributes,
    })) as Curso[];

    return cursos.map(curso => ({
      cursoId: curso.id,
      titulo: curso.titulo,
      matchPercentagem: Math.floor(Math.random() * 15) + 80, // Match simulado entre 80-95%
      motivo: `Com base no seu excelente desempenho em simulações e score global de ${perfil.scoreGlobal}.`,
    }));
  }
};
