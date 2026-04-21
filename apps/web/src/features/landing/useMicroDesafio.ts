import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSocket } from '../../lib/realtime/useSocket';
import { telemetriaService } from '../../lib/telemetria/telemetria.service';
import {
  type Area, type MicroDesafioState, type PerguntaData,
  detectarArea, AREA_LABEL, PERGUNTAS_FALLBACK,
} from './microDesafioData';
import { type LandingQuestionsResponse, LandingVereditoSchema } from '@pdc/shared';

const API_URL: string =
  (import.meta.env['VITE_API_URL'] as string | undefined) ?? '/api';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMicroDesafio() {
  const { on } = useSocket();

  const sessionId = useMemo(() => {
    const stored = sessionStorage.getItem('pdc_session_id');
    if (stored) return stored;
    const id = crypto.randomUUID();
    sessionStorage.setItem('pdc_session_id', id);
    return id;
  }, []);

  const [state, setState] = useState<MicroDesafioState>({
    fase: 'intro',
    textoLivre: '',
    perguntaActual: 0,
    respostas: [],
    veredito: null,
    pulso: { count: 0 },
  });

  const [perguntas, setPerguntas] = useState<PerguntaData[]>([]);

  // ── Socket pulse ──────────────────────────────────────────────────────────

  useEffect(() => {
    return on<{ count: number; area?: string }>('landing:pulse', (data) => {
      setState((s) => ({ ...s, pulso: { count: data.count, ...(data.area ? { area: data.area } : {}) } }));
    });
  }, [on]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const areaDetectada = useMemo(() => detectarArea(state.textoLivre), [state.textoLivre]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const comecar = useCallback(() => {
    setState((s) => ({ ...s, fase: 'texto_livre' }));
    void telemetriaService.registarEvento('landing_hero_started', {}).catch(() => undefined);
  }, []);

  const setTextoLivre = useCallback((texto: string) => {
    setState((s) => ({ ...s, textoLivre: texto }));
  }, []);

  const submeterTexto = useCallback(async () => {
    const area = detectarArea(state.textoLivre);
    setState((s) => ({ ...s, fase: 'carregando' }));

    try {
      // 1. Report activity to Live Pulse
      void fetch(`${API_URL}/landing/pulse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, area: area !== 'OUTRA' ? area : undefined }),
      }).catch(() => undefined);

      // 2. Fetch dynamic questions (with Rate Limit check)
      const res = await fetch(`${API_URL}/landing/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area, regiao: 'Angola' }), // Defaulting to Angola as starting point
      });

      if (res.status === 429) {
        setState((s) => ({ ...s, fase: 'limite' }));
        return;
      }

      if (!res.ok) throw new Error('Falha ao obter perguntas');

      const data = (await res.json()) as LandingQuestionsResponse;
      const dynamicPerguntas = data.perguntas;

      setPerguntas(dynamicPerguntas.length > 0 ? dynamicPerguntas : PERGUNTAS_FALLBACK);
      setState((s) => ({ ...s, fase: 'pergunta' }));
      
      if (state.textoLivre.length >= 3 && area !== 'OUTRA') {
        void telemetriaService.registarEvento('landing_hero_area_detected', { area }).catch(() => undefined);
      }
    } catch (err) {
      console.error('Questions fetch failed:', err);
      setPerguntas(PERGUNTAS_FALLBACK);
      setState((s) => ({ ...s, fase: 'pergunta' }));
    }
  }, [state.textoLivre, sessionId]);

  const gerarVeredito = useCallback(async (respostas: number[], area: Area, textoLivre: string, perguntasAtuais: PerguntaData[]) => {
    setState((s) => ({ ...s, fase: 'carregando' }));

    const respostasTexto = respostas
      .map((r, i) => {
        const p = perguntasAtuais[i];
        const opt = p?.opcoes[r];
        return p && opt ? `${p.texto} → ${opt.texto}` : '';
      })
      .filter(Boolean)
      .join('; ');

    const prompt = [
      'Analisa o perfil vocacional deste estudante.',
      `Área de interesse: ${AREA_LABEL[area]}`,
      `Contexto: "${textoLivre}"`,
      `Respostas ao desafio: ${respostasTexto}`,
      'Retorna APENAS JSON válido:',
      '{"area":"string","score":60-99,"arquetipo":"string curto","proximoPasso":"frase curta","simulacoes":["sim1","sim2","sim3"]}',
    ].join('\n');

    try {
      const res = await fetch(`${API_URL}/tina/chat`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, stream: false }),
      });

      if (!res.ok) throw new Error(`HTTP ${String(res.status)}`);

      const data = (await res.json()) as { text: string };
      const text = data.text;

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON');

      const v = LandingVereditoSchema.parse(JSON.parse(jsonMatch[0]));

      setState((s) => ({ ...s, fase: 'veredito', veredito: v }));
      void telemetriaService
        .registarEvento('landing_hero_verdict_generated', { area, score: v.score })
        .catch(() => undefined);
    } catch (err) {
      console.error('Veredito failed:', err);
      setState((s) => ({ ...s, fase: 'erro' as const }));
      void telemetriaService
        .registarEvento('landing_hero_verdict_failed', { area })
        .catch(() => undefined);
    }
  }, []);

  const responder = useCallback(
    (opcaoIndex: number) => {
      const respostas = [...state.respostas, opcaoIndex];
      const proxima = state.perguntaActual + 1;

      if (proxima >= perguntas.length) {
        void gerarVeredito(respostas, areaDetectada, state.textoLivre, perguntas);
        setState((s) => ({ ...s, respostas, perguntaActual: proxima }));
      } else {
        setState((s) => ({ ...s, respostas, perguntaActual: proxima }));
      }
    },
    [state.respostas, state.perguntaActual, state.textoLivre, areaDetectada, perguntas, gerarVeredito],
  );

  const reiniciar = useCallback(() => {
    setState((s) => ({
      fase: 'intro',
      textoLivre: '',
      perguntaActual: 0,
      respostas: [],
      veredito: null,
      pulso: s.pulso,
    }));
    setPerguntas([]);
  }, []);

  return { state, areaDetectada, perguntas, comecar, setTextoLivre, submeterTexto, responder, reiniciar };
}
