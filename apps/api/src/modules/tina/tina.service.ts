import { Redis } from '@upstash/redis';
import { aiService } from '../ai/ai.service.js';
import { TINA_KNOWLEDGE, type TinaKnowledgeItem } from './tina.knowledge.js';
import { validarMensagem } from './tina.guardrails.js';
import { verificarLimite } from './tina.ratelimit.js';
import type { ChatMessage } from '@pdc/shared';
import { env } from '../../lib/env.js';

const redis = env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

const AI_PROVIDER = env.AI_PROVIDER;

interface AiChatResponse {
  choices?: { message: { content: string } }[];
  message?: { content: string };
}

function isPerguntasResponse(value: unknown): value is { perguntas: unknown[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'perguntas' in value &&
    Array.isArray(value.perguntas)
  );
}

export const tinaService = {
  buildSystemPrompt(userContext: string, chunks: string): string {
    return `És a Tina, a assistente virtual inteligente do PDC (Por Dentro do Curso).
Teu objetivo: Ajudar utilizadores a navegar na plataforma e responder a dúvidas sobre orientação vocacional em Angola.
Regras:
1. Sê profissional, amigável e direta.
2. Usa apenas a informação fornecida no contexto abaixo para responder a dúvidas técnicas sobre a plataforma.
3. Se não souberes a resposta, sugere contactar o suporte ou um mentor.
4. Contexto do utilizador: ${userContext}
5. Informação da Base de Conhecimento: ${chunks}`;
  },

  async buscarChunks(query: string): Promise<string> {
    if (!redis) return '';
    const keys = await redis.keys('tina:kb:*');
    if (keys.length === 0) return '';
    
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const matches: string[] = [];
    
    for (const key of keys) {
      const item = await redis.get<TinaKnowledgeItem>(key);
      if (item && words.some(w => item.conteudo.toLowerCase().includes(w) || item.titulo.toLowerCase().includes(w))) {
        matches.push(`${item.titulo}: ${item.conteudo}`);
      }
    }
    
    return matches.slice(0, 3).join(' | ');
  },

  async indexarKnowledge(): Promise<void> {
    if (!redis) return;
    for (let i = 0; i < TINA_KNOWLEDGE.length; i++) {
      await redis.set(`tina:kb:${i.toString()}`, JSON.stringify(TINA_KNOWLEDGE[i]));
    }
  },

  async chat(messages: ChatMessage[], userId: string | null, ip: string, stream: boolean): Promise<Response> {
    const lastMessage = messages[messages.length - 1]?.content || '';
    
    const guard = validarMensagem(lastMessage);
    if (!guard.valida) {
      return new Response(JSON.stringify({ error: guard.motivo }), { status: 400 });
    }

    const rate = await verificarLimite(userId, ip);
    if (!rate.permitido) {
      return new Response(JSON.stringify({ error: 'Limite de mensagens excedido. Tenta mais tarde.' }), { status: 429 });
    }

    const chunks = await this.buscarChunks(lastMessage);
    const userContext = userId ? await aiService.buildContexto(userId) : 'Utilizador não autenticado.';
    const systemPrompt = this.buildSystemPrompt(userContext, chunks);

    // AI call logic
    if (AI_PROVIDER === 'deepseek') {
      return aiService.chat(messages, systemPrompt, stream);
    } else {
      return aiService.fallbackOllama(messages, stream);
    }
  },

  async gerarPerguntasDesafio(area: string, regiao: string = 'global'): Promise<unknown> {
    const prompt = `Gera 5 perguntas imersivas para um micro-desafio vocacional na área de ${area}.
Contexto de Mercado: ${regiao}.
As perguntas devem ser curtas, desafiantes e refletir dilemas reais da profissão.
Retorna APENAS um JSON no formato:
{
  "perguntas": [
    {
      "texto": "Frase da pergunta?",
      "opcoes": [
        { "emoji": "🚀", "texto": "Opção 1" },
        { "emoji": "🛠️", "texto": "Opção 2" },
        { "emoji": "📊", "texto": "Opção 3" },
        { "emoji": "🧠", "texto": "Opção 4" }
      ]
    }
  ]
}`;

    const res = await aiService.chat([{ role: 'user', content: prompt }], 'Geração de Desafio Vocacional', false);
    const data = await res.json() as AiChatResponse;
    
    let content = '';
    if (data.choices) {
      content = data.choices[0]?.message.content || '{}';
    } else if (data.message) {
      content = data.message.content;
    }

    try {
      const parsed: unknown = JSON.parse(content.replace(/```json|```/g, ''));
      return isPerguntasResponse(parsed) ? parsed.perguntas : [];
    } catch {
      return [];
    }
  },

  async gerarVereditoPsicometrico(metrics: {
    phi: number;
    resilience: number;
    focus: number;
    domainId: string;
  }): Promise<string> {
    const prompt = `Analisa os seguintes índices psicométricos de um estudante na área de ${metrics.domainId}:
- Fluidez Cognitiva (phi): ${metrics.phi.toFixed(2)}/10
- Resiliência ao Erro ($R$): ${metrics.resilience.toFixed(2)}/10
- Estabilidade de Foco: ${metrics.focus.toFixed(2)}/10

Gera um veredito curto (máx 2 parágrafos) impiedosamente honesto e técnico sobre o potencial deste estudante.
Usa uma linguagem que misture rigor científico com visão de mercado.
Retorna APENAS o texto do veredito.`;

    const res = await aiService.chat([{ role: 'user', content: prompt }], 'Análise Psicométrica de Elite', false);
    const data = await res.json() as AiChatResponse;
    
    if (data.choices) {
      return data.choices[0]?.message.content || '';
    } else if (data.message) {
      return data.message.content;
    }
    return '';
  },
};
