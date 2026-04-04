import type { ChatPayload, QuizPergunta } from '@pdc/shared';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export const aiApi = {
  chat(payload: ChatPayload): Promise<ReadableStream<Uint8Array>> {
    return fetch(`${BASE_URL}/ai/chat`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((res) => {
      if (!res.ok) throw new Error(`AI chat falhou: ${res.status.toString()}`);
      if (!res.body) throw new Error('Resposta sem body stream');
      return res.body;
    });
  },

  quiz(cursoId: string, moduloId: string): Promise<QuizPergunta[]> {
    return fetch(`${BASE_URL}/ai/quiz`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cursoId, moduloId }),
    }).then((res) => {
      if (!res.ok) throw new Error(`AI quiz falhou: ${res.status.toString()}`);
      return res.json() as Promise<QuizPergunta[]>;
    });
  },
};
