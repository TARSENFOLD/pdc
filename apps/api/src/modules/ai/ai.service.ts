import pino from 'pino';
import { strapiGet } from '../strapi/strapi.client.js';
import { vocacionalService } from '../vocacional/vocacional.service.js';
import type { ChatMessage, QuizPergunta } from '@pdc/shared';
import { env } from '../../lib/env.js';

const log = pino({ name: 'ai-service' });

const DEEPSEEK_API_KEY = env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE_URL = env.DEEPSEEK_BASE_URL;
const DEEPSEEK_MODEL = env.DEEPSEEK_MODEL;
const OLLAMA_BASE_URL = env.OLLAMA_BASE_URL;
const OLLAMA_MODEL = env.OLLAMA_MODEL;

export const aiService = {
  async buildContexto(estudanteId: string): Promise<string> {
    const perfil = await vocacionalService.calcularPerfil(estudanteId);
    
    // Fix: Strapi client already flattens. Removed nested { data: ... }
    const tentativasRes = await strapiGet<{ id: number; simulacao?: { titulo: string } }>('/tentativas', {
      'filters[estudanteId][$eq]': estudanteId,
      'filters[dataFim][$notNull]': 'true',
      'populate': 'simulacao',
    });
    
    const inscricoesRes = await strapiGet<{ id: number; curso?: { titulo: string } }>('/inscricoes', {
      'filters[estudanteId][$eq]': estudanteId,
      'populate': 'curso',
    });

    const sims = tentativasRes.data.map(t => {
      return t.simulacao?.titulo;
    }).filter(Boolean).join(', ');

    const cursos = inscricoesRes.data.map(i => {
      return i.curso?.titulo;
    }).filter(Boolean).join(', ');

    return `Perfil Vocacional: Score Global ${perfil.scoreGlobal.toString()}, Aptidão ${perfil.aptidao.toString()}, Dedicação ${perfil.dedicacao.toString()}. Simulações concluídas: ${sims || 'Nenhuma'}. Cursos inscritos: ${cursos || 'Nenhum'}.`;
  },

  async chat(messages: ChatMessage[], contexto: string, stream: boolean): Promise<Response> {
    const systemMessage: ChatMessage = {
      role: 'system',
      content: `És o Tutor IA do PDC (Por Dentro do Curso). O teu objetivo é orientar estudantes angolanos na sua jornada vocacional. Contexto do estudante: ${contexto}`,
    };

    const fullMessages = [systemMessage, ...messages];

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => { controller.abort(); }, 10000);

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
        return await this.fallbackOllama(fullMessages, stream);
      }

      return res;
    } catch (err) {
      log.error({ err }, 'DeepSeek error, falling back to Ollama');
      return this.fallbackOllama(fullMessages, stream);
    }
  },

  async fallbackOllama(messages: ChatMessage[], stream: boolean): Promise<Response> {
    return await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
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
