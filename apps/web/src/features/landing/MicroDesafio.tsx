import { motion, useReducedMotion } from 'motion/react';
import { type Area, type PerguntaData, AREA_EMOJI, AREA_LABEL } from './microDesafioData';
import { useMicroDesafio } from './useMicroDesafio';
import { MicroDesafioVeredito } from './MicroDesafioVeredito.tsx';

// ─── Animation variants ──────────────────────────────────────────────────────

const fade = (reduced: boolean | null) => ({
  initial: reduced ? { opacity: 0 } : { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: reduced ? { opacity: 0 } : { opacity: 0, y: -16 },
  transition: { duration: 0.35, ease: 'easeOut' },
});

type F = ReturnType<typeof fade>;

// ─── Main component ──────────────────────────────────────────────────────────

export function MicroDesafio() {
  const { state, areaDetectada, perguntas, comecar, setTextoLivre, submeterTexto, responder, reiniciar } =
    useMicroDesafio();
  const reduced = useReducedMotion();
  const f = fade(reduced);
  const perguntaActual: PerguntaData | undefined = perguntas[state.perguntaActual];

  return (
    <div className="mx-auto mt-14 w-full max-w-xl rounded-2xl border border-amber/30 bg-surface p-6 sm:p-8">
      {state.fase === 'intro' && <Intro pulso={state.pulso} onComecar={comecar} f={f} />}
      {state.fase === 'texto_livre' && (
        <TextoLivre
          texto={state.textoLivre}
          area={areaDetectada}
          onChange={setTextoLivre}
          onSubmeter={submeterTexto}
          f={f}
        />
      )}
      {state.fase === 'pergunta' && perguntaActual && (
        <PerguntaCard
          pergunta={perguntaActual}
          index={state.perguntaActual}
          total={perguntas.length}
          onResponder={responder}
          f={f}
        />
      )}
      {state.fase === 'carregando' && <Carregando f={f} />}
      {state.fase === 'veredito' && state.veredito && (
        <MicroDesafioVeredito veredito={state.veredito} onReiniciar={reiniciar} reduced={reduced} />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Intro({ pulso, onComecar, f }: { pulso: { count: number; area?: string }; onComecar: () => void; f: F }) {
  return (
    <motion.div {...f} className="flex flex-col items-center gap-4 text-center">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber/10 px-3 py-1 text-xs font-medium text-amber">
        ⚡ Micro Desafio
      </span>
      <h3 className="text-xl font-bold text-text-primary">
        Descobre o teu perfil vocacional em 60 segundos
      </h3>
      <p className="text-sm text-text-secondary">
        Diz-nos o que te interessa + 5 perguntas rápidas = veredicto por IA
      </p>
      {pulso.count > 0 && (
        <p className="animate-pulse text-xs text-text-muted">
          🟢 {pulso.count} pessoas em {pulso.area ?? 'exploração'} agora
        </p>
      )}
      <button
        onClick={onComecar}
        className="mt-2 rounded-xl bg-amber px-6 py-3 text-sm font-semibold text-black transition-all hover:scale-[1.02] hover:bg-amber-hover"
      >
        Aceitar o desafio
      </button>
    </motion.div>
  );
}

function TextoLivre({ texto, area, onChange, onSubmeter, f }: {
  texto: string; area: Area; onChange: (t: string) => void; onSubmeter: () => void; f: F;
}) {
  return (
    <motion.div {...f} className="flex flex-col gap-4">
      <h3 className="text-center text-lg font-bold text-text-primary">
        Em que área te imaginas a trabalhar?
      </h3>
      <textarea
        value={texto}
        onChange={(e) => { onChange(e.target.value); }}
        placeholder="Ex: Gosto de tecnologia, programação e resolver problemas..."
        className="h-24 w-full resize-none rounded-xl border border-border bg-surface-raised p-4 text-sm text-text-primary placeholder:text-text-muted focus:border-amber/40 focus:outline-none"
      />
      {texto.length >= 3 && (
        <div className="flex items-center justify-center gap-2">
          <span className="rounded-full bg-amber/10 px-3 py-1 text-xs font-medium text-amber">
            {AREA_EMOJI[area]} {AREA_LABEL[area]}
          </span>
        </div>
      )}
      <button
        onClick={onSubmeter}
        disabled={texto.trim().length < 3}
        className="rounded-xl bg-amber px-6 py-3 text-sm font-semibold text-black transition-all hover:scale-[1.02] hover:bg-amber-hover disabled:opacity-40 disabled:hover:scale-100"
      >
        Continuar →
      </button>
    </motion.div>
  );
}

function PerguntaCard({ pergunta, index, total, onResponder, f }: {
  pergunta: PerguntaData; index: number; total: number; onResponder: (i: number) => void; f: F;
}) {
  return (
    <motion.div {...f} key={index} className="flex flex-col gap-5">
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`h-2 w-2 rounded-full transition-colors ${i <= index ? 'bg-amber' : 'bg-white/10'}`}
          />
        ))}
      </div>
      <p className="text-center text-base font-medium text-text-primary">{pergunta.texto}</p>
      <div className="grid grid-cols-2 gap-2.5">
        {pergunta.opcoes.map((opcao, i) => (
          <button
            key={i}
            onClick={() => { onResponder(i); }}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface-raised px-3 py-4 text-center text-sm text-text-secondary transition-all hover:border-amber/40 hover:bg-amber/5 hover:text-text-primary"
          >
            <span className="text-xl">{opcao.emoji}</span>
            <span className="text-xs">{opcao.texto}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function Carregando({ f }: { f: F }) {
  return (
    <motion.div {...f} className="flex flex-col items-center gap-4 py-8">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber/30 border-t-amber" />
      <p className="text-sm text-text-secondary">A Tina está a analisar o teu perfil…</p>
    </motion.div>
  );
}
