import pino from 'pino';
import { aiService } from '../ai/ai.service.js';
import {
  TINA_KNOWLEDGE,
  TinaKnowledgeItemSchema,
  type TinaKnowledgeItem,
} from './tina.knowledge.js';
import { validarMensagem } from './tina.guardrails.js';
import { verificarLimite } from './tina.ratelimit.js';
import {
  LandingVereditoSchema,
  type ChatMessage,
  type LandingVeredito,
  type Role,
} from '@pdc/shared';
import { z } from 'zod';
import { env } from '../../lib/env.js';
import { hasPrimaryRedis, redis } from '../../lib/redis.js';
import { tinaContextService } from './tina-context.service.js';

const AI_PROVIDER = env.AI_PROVIDER;
const log = pino({ name: 'tina-service' });

const AiChatResponseSchema = z
  .object({
    choices: z
      .array(
        z.object({
          message: z.object({ content: z.string() }),
        })
      )
      .optional(),
    message: z.object({ content: z.string() }).optional(),
  })
  .refine((value) => value.choices !== undefined || value.message !== undefined, {
    message: 'Resposta da IA deve conter choices ou message',
  });

type AiChatResponse = z.infer<typeof AiChatResponseSchema>;

const JsonObjectSchema = z.record(z.string(), z.unknown());

const PerguntaDesafioSchema = z.object({
  texto: z.string().min(1),
  opcoes: z
    .array(
      z.object({
        emoji: z.string().min(1),
        texto: z.string().min(1),
      })
    )
    .min(2),
});

const PerguntasDesafioResponseSchema = z.object({
  perguntas: z.array(PerguntaDesafioSchema),
});

function parseKnowledgeItem(rawItem: unknown): TinaKnowledgeItem | null {
  let candidate = rawItem;
  if (typeof candidate === 'string') {
    try {
      candidate = JSON.parse(candidate) as unknown;
    } catch {
      return null;
    }
  }

  const parsed = TinaKnowledgeItemSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

function extractAiContent(data: AiChatResponse): string {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- payload externo pode omitir message em runtime
  return data.choices?.[0]?.message?.content ?? data.message?.content ?? '';
}

async function readAiChatResponse(response: Response): Promise<AiChatResponse | null> {
  if (!response.ok) {
    log.warn({ status: response.status }, 'Provider de IA devolveu resposta não-2xx');
    return null;
  }
  try {
    const parsed = AiChatResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      log.warn(
        { issues: parsed.error.issues },
        'Payload do provider de IA não corresponde ao contrato'
      );
      return null;
    }
    return parsed.data;
  } catch (error: unknown) {
    log.warn({ err: error }, 'Falha ao interpretar resposta JSON do provider de IA');
    return null;
  }
}

export function extractJsonObject(content: string): unknown {
  const normalized = content.trim();
  const start = normalized.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < normalized.length; i += 1) {
    const char = normalized[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return JsonObjectSchema.parse(JSON.parse(normalized.slice(start, i + 1)));
      }
    }
  }

  return null;
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
    if (!hasPrimaryRedis) return '';
    try {
      const words = query
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3);
      const matches: string[] = [];

      for (let i = 0; i < TINA_KNOWLEDGE.length; i += 1) {
        const key = `tina:kb:${i.toString()}`;
        const rawItem = await redis.get<unknown>(key);
        if (rawItem === null) continue;

        const item = parseKnowledgeItem(rawItem);
        if (!item) {
          log.warn({ key }, 'Entrada inválida no cache de conhecimento da Tina');
          continue;
        }
        if (
          words.some(
            (word) =>
              item.conteudo.toLowerCase().includes(word) || item.titulo.toLowerCase().includes(word)
          )
        ) {
          matches.push(`${item.titulo}: ${item.conteudo}`);
        }
      }

      return matches.slice(0, 3).join(' | ');
    } catch (error: unknown) {
      log.warn({ err: error }, 'Cache de conhecimento indisponível; Tina continuará sem chunks');
      return '';
    }
  },

  async indexarKnowledge(): Promise<void> {
    if (!hasPrimaryRedis) return;
    const results = await Promise.allSettled(
      TINA_KNOWLEDGE.map((item, index) => redis.set(`tina:kb:${index.toString()}`, item))
    );
    const failedWrites = results.filter((result) => result.status === 'rejected');
    if (failedWrites.length > 0) {
      log.warn(
        { failedWrites: failedWrites.length, totalWrites: results.length },
        'Falha parcial ao indexar conhecimento da Tina'
      );
    }
  },

  async chat(
    messages: ChatMessage[],
    userId: string | null,
    ip: string,
    stream: boolean,
    role?: Role
  ): Promise<Response> {
    const lastMessage = messages[messages.length - 1]?.content;
    if (!lastMessage) {
      return new Response(JSON.stringify({ error: 'Mensagem ausente ou vazia' }), { status: 400 });
    }

    const guard = validarMensagem(lastMessage);
    if (!guard.valida) {
      return new Response(JSON.stringify({ error: guard.motivo }), { status: 400 });
    }

    const rate = await verificarLimite(userId, ip);
    if (!rate.permitido) {
      return new Response(
        JSON.stringify({ error: 'Limite de mensagens excedido. Tenta mais tarde.' }),
        { status: 429 }
      );
    }

    const chunks = await this.buscarChunks(lastMessage);
    const userContext = await tinaContextService.build(userId, role);
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

    const res = await aiService.chat(
      [{ role: 'user', content: prompt }],
      'Geração de Desafio Vocacional',
      false
    );
    const data = await readAiChatResponse(res);
    if (!data) return [];

    const content = extractAiContent(data);

    try {
      const parsed = PerguntasDesafioResponseSchema.parse(extractJsonObject(content));
      return parsed.perguntas;
    } catch {
      return [];
    }
  },

  async gerarVereditoDesafio(input: {
    area: string;
    contexto: string;
    respostas: string[];
  }): Promise<LandingVeredito | null> {
    const prompt = `Analisa este micro-desafio vocacional.
Área de interesse: ${input.area}
Contexto do participante: ${input.contexto}
Respostas: ${input.respostas.join('; ')}

Retorna APENAS JSON válido:
{"area":"string","score":60,"arquetipo":"string curto","proximoPasso":"frase curta","simulacoes":["simulação 1","simulação 2","simulação 3"]}`;

    const res = await aiService.chat(
      [{ role: 'user', content: prompt }],
      'Diagnóstico vocacional público do PDC. Não inclua markdown.',
      false
    );
    const data = await readAiChatResponse(res);
    if (!data) return null;
    try {
      return LandingVereditoSchema.parse(extractJsonObject(extractAiContent(data)));
    } catch {
      return null;
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

    const res = await aiService.chat(
      [{ role: 'user', content: prompt }],
      'Análise Psicométrica de Elite',
      false
    );
    const data = await readAiChatResponse(res);
    if (!data) return '';
    return extractAiContent(data);
  },
};
