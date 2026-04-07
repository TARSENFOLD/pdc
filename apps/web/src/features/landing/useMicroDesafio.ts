import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSocket } from '../../lib/realtime/useSocket';
import { telemetriaService } from '../../lib/telemetria/telemetria.service';
import {
  type Area, type MicroDesafioState, type Veredito,
  detectarArea, PERGUNTAS, AREA_LABEL,
} from './microDesafioData';

const API_URL: string =
  (import.meta.env['VITE_API_URL'] as string | undefined) ?? 'http://localhost:3001';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMicroDesafio() {
  const { on } = useSocket();

  const [state, setState] = useState<MicroDesafioState>({
    fase: 'intro',
    textoLivre: '',
    perguntaActual: 0,
    respostas: [],
    veredito: null,
    pulso: { count: 0 },
  });

  // ── Socket pulse ──────────────────────────────────────────────────────────

  useEffect(() => {
    return on<{ count: number; area?: string }>('landing:pulse', (data) => {
      setState((s) => ({ ...s, pulso: { count: data.count, ...(data.area ? { area: data.area } : {}) } }));
    });
  }, [on]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const areaDetectada = useMemo(() => detectarArea(state.textoLivre), [state.textoLivre]);
  const perguntas = PERGUNTAS[areaDetectada];

  // ── Actions ───────────────────────────────────────────────────────────────

  const comecar = useCallback(() => {
    setState((s) => ({ ...s, fase: 'texto_livre' }));
    void telemetriaService.registarEvento('landing_hero_started', {}).catch(() => undefined);
  }, []);

  const setTextoLivre = useCallback((texto: string) => {
    setState((s) => ({ ...s, textoLivre: texto }));
  }, []);

  const submeterTexto = useCallback(() => {
    setState((s) => {
      const area = detectarArea(s.textoLivre);
      if (s.textoLivre.length >= 3 && area !== 'GERAL') {
        void telemetriaService.registarEvento('landing_hero_area_detected', { area }).catch(() => undefined);
      }
      return { ...s, fase: 'pergunta' as const };
    });
  }, []);

  const gerarVeredito = useCallback(async (respostas: number[], area: Area, textoLivre: string) => {
    setState((s) => ({ ...s, fase: 'carregando' }));

    const areaPerguntas = PERGUNTAS[area];
    const respostasTexto = respostas
      .map((r, i) => {
        const p = areaPerguntas[i];
        const opt = p?.opcoes[r];
        return p && opt ? `${p.texto} → ${opt.texto}` : '';
      })
      .filter(Boolean)
      .join('; ');

    const prompt = [
      'Analisa o perfil vocacional deste estudante angolano.',
      `Área de interesse: ${AREA_LABEL[area]}`,
      `Texto livre: "${textoLivre}"`,
      `Respostas: ${respostasTexto}`,
      'Retorna APENAS JSON válido (sem markdown):',
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

      const data: unknown = await res.json();
      const text =
        typeof data === 'object' && data !== null && 'text' in data
          ? String((data as Record<string, unknown>).text)
          : typeof data === 'string'
            ? data
            : String(data);

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON');

      const parsed: unknown = JSON.parse(jsonMatch[0]);
      if (typeof parsed !== 'object' || parsed === null) throw new Error('Bad shape');

      const obj = parsed as Record<string, unknown>;
      if (!('area' in obj && 'score' in obj && 'arquetipo' in obj)) throw new Error('Bad shape');

      const v: Veredito = {
        area: String(obj.area),
        score: Number(obj.score),
        arquetipo: String(obj.arquetipo),
        proximoPasso: typeof obj.proximoPasso === 'string' ? obj.proximoPasso : '',
        simulacoes: Array.isArray(obj.simulacoes)
          ? (obj.simulacoes as string[]).map(String)
          : [],
      };

      setState((s) => ({ ...s, fase: 'veredito', veredito: v }));
      void telemetriaService
        .registarEvento('landing_hero_verdict_generated', { area, score: v.score })
        .catch(() => undefined);
    } catch {
      setState((s) => ({ ...s, fase: 'erro' as const }));
      void telemetriaService
        .registarEvento('landing_hero_verdict_failed', { area })
        .catch(() => undefined);
    }
  }, []);

  const responder = useCallback(
    (opcaoIndex: number) => {
      setState((s) => {
        const respostas = [...s.respostas, opcaoIndex];
        const proxima = s.perguntaActual + 1;
        const area = detectarArea(s.textoLivre);

        if (proxima >= PERGUNTAS[area].length) {
          void gerarVeredito(respostas, area, s.textoLivre);
          return { ...s, respostas, perguntaActual: proxima };
        }

        return { ...s, respostas, perguntaActual: proxima };
      });
    },
    [gerarVeredito],
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
  }, []);

  return { state, areaDetectada, perguntas, comecar, setTextoLivre, submeterTexto, responder, reiniciar };
}
