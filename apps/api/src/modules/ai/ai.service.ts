import { strapiGet } from '../strapi/strapi.client.js';
import { vocacionalService } from '../vocacional/vocacional.service.js';
import type { ChatMessage, QuizPergunta } from '@pdc/shared';

const DEEPSEEK_API_KEY = process.env['DEEPSEEK_API_KEY'] || '';
const DEEPSEEK_BASE_URL = process.env['DEEPSEEK_BASE_URL'] || 'https://api.deepseek.com';
const DEEPSEEK_MODEL = process.env['DEEPSEEK_MODEL'] || 'deepseek-chat';
const OLLAMA_BASE_URL = process.env['OLLAMA_BASE_URL'] || 'http://localhost:11434';
const OLLAMA_MODEL = process.env['OLLAMA_MODEL'] || 'llama3.2';

export const aiService = {
  async buildContexto(alunoId: string): Promise<string> {
    const perfil = await vocacionalService.calcularPerfil(alunoId);
    
    const tentativasRes = await strapiGet<{ data: Array<{ id: number; attributes: any }> }>('/tentativas', {
      'filters[alunoId][$eq]': alunoId,
      'filters[dataFim][$notNull]': 'true',
      'populate': 'simulacao',
    });
    
    const inscricoesRes = await strapiGet<{ data: Array<{ id: number; attributes: Record<string, unknown> }> }>('/inscricoes', {
      'filters[alunoId][$eq]': alunoId,
      'populate': 'curso',
    });

    const sims = tentativasRes.data.map(t => {
      const sim = t.attributes['simulacao'] as { data: { attributes: { titulo: string } } } | undefined;
      return sim?.data?.attributes?.titulo;
    }).filter(Boolean).join(', ');

    const cursos = inscricoesRes.data.map(i => {
      const curso = i.attributes['curso'] as { data: { attributes: { titulo: string } } } | undefined;
      return curso?.data?.attributes?.titulo;
    }).filter(Boolean).join(', ');

    return `Perfil Vocacional: Score Global ${perfil.scoreGlobal.toString()}, Aptidão ${perfil.aptidao.toString()}, Dedicação ${perfil.dedicacao.toString()}. Simulações concluídas: ${sims || 'Nenhuma'}. Cursos inscritos: ${cursos || 'Nenhum'}.`;
  },

  async chat(messages: ChatMessage[], contexto: string, stream: boolean): Promise<Response> {
    const systemMessage: ChatMessage = {
      role: 'system',
      content: `És o Tutor IA do PDC (Por Dentro do Curso). O teu objetivo é orientar alunos angolanos na sua jornada vocacional. Contexto do aluno: ${contexto}`,
    };

    const fullMessages = [systemMessage, ...messages];

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: DEEPSEEK_MODEL,
          messages: fullMessages,
          stream,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok || res.status >= 500) {
        return this.fallbackOllama(fullMessages, stream);
      }

      return res;
    } catch (err) {
      console.error('DeepSeek error, falling back to Ollama:', err);
      return this.fallbackOllama(fullMessages, stream);
    }
  },

  async fallbackOllama(messages: ChatMessage[], stream: boolean): Promise<Response> {
    return fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream,
      }),
    });
  },

  async gerarQuiz(cursoId: string, moduloId: string): Promise<QuizPergunta[]> {
    const prompt = `Gera um quiz com 5 perguntas de escolha múltipla para o módulo ${moduloId} do curso ${cursoId}. Retorna apenas um JSON array de QuizPergunta [{id, pergunta, opcoes: [4], respostaCorreta: 0-3, explicacao}].`;
    
    const res = await this.chat([{ role: 'user', content: prompt }], 'Geração de Quiz', false);
    const data = await res.json() as { choices: Array<{ message: { content: string } }> } | { message: { content: string } };
    
    let content = '';
    if ('choices' in data) {
      content = data.choices[0]?.message.content || '[]';
    } else if ('message' in data) {
      content = data.message.content;
    }

    try {
      return JSON.parse(content.replace(/```json|```/g, '')) as QuizPergunta[];
    } catch {
      return [];
    }
  },
};
