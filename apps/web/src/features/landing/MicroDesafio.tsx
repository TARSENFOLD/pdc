import { motion, useReducedMotion } from 'motion/react';
import { Circle } from 'lucide-react';
import { type Area, type PerguntaData, AREA_EMOJI, AREA_LABEL } from './microDesafioData';
import { useMicroDesafio } from './useMicroDesafio';
import { MicroDesafioVeredito } from './MicroDesafioVeredito.tsx';

// ─── Animation variants ──────────────────────────────────────────────────────

const fade = (reduced: boolean | null) => ({
  initial: reduced ? { opacity: 0 } : { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: reduced ? { opacity: 0 } : { opacity: 0, y: -16 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
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
    <div className="mx-auto mt-14 w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-10 backdrop-blur-2xl shadow-2xl">
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
      {state.fase === 'limite' && <Limite onReiniciar={reiniciar} f={f} />}
      {state.fase === 'erro' && (
        <motion.div {...f} className="flex flex-col items-center gap-4 py-8 text-center">
          <p className="text-sm font-medium text-error">Não foi possível gerar o teu veredito.</p>
          <p className="text-xs text-text-muted">A nossa IA está temporariamente indisponível.</p>
          <button onClick={reiniciar} className="mt-2 rounded-xl border border-border px-6 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-white/5">Tentar novamente</button>
        </motion.div>
      )}
      {state.fase === 'veredito' && state.veredito && (
        <MicroDesafioVeredito veredito={state.veredito} onReiniciar={reiniciar} reduced={reduced} />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Intro({ pulso, onComecar, f }: { pulso: { count: number; area?: string }; onComecar: () => void; f: F }) {
  return (
    <motion.div {...f} className="flex flex-col items-center gap-6 text-center">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-accent">
        ⚡ Diagnóstico Instantâneo
      </span>
      <h3 className="text-2xl font-bold tracking-tight text-text-primary">
        Descobre o teu perfil vocacional em 60 segundos
      </h3>
      <p className="text-sm leading-relaxed text-text-secondary">
        Diz-nos o que te interessa + 5 perguntas rápidas. <br />
        <span className="text-text-muted">O Oráculo PDC processa os dados em tempo real.</span>
      </p>
      {pulso.count > 0 && (
        <p className="font-mono text-[10px] uppercase tracking-widest text-text-muted opacity-80">
          <Circle size={6} aria-hidden={true} className="inline-block mr-2 fill-accent text-accent animate-pulse" />
          {pulso.count} talentos em {pulso.area ?? 'exploração'} agora
        </p>
      )}
      <button
        onClick={onComecar}
        className="mt-2 rounded-xl bg-accent px-8 py-3 text-sm font-bold text-white shadow-lg shadow-accent/20 transition-all hover:scale-[1.03] hover:bg-accent-hover"
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
    <motion.div {...f} className="flex flex-col gap-6">
      <h3 className="text-center text-lg font-bold text-text-primary tracking-tight">
        Em que área te imaginas a trabalhar?
      </h3>
      <textarea
        value={texto}
        onChange={(e) => { onChange(e.target.value); }}
        placeholder="Ex: Gosto de tecnologia, programação e resolver problemas..."
        className="h-28 w-full resize-none rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-text-primary placeholder:text-text-muted focus:border-accent/40 focus:outline-none transition-colors"
      />
      {texto.length >= 3 && (
        <div className="flex items-center justify-center gap-2">
          <span className="rounded-full bg-accent/10 border border-accent/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-accent">
            {AREA_EMOJI[area]} {AREA_LABEL[area]} detectado
          </span>
        </div>
      )}
      <button
        onClick={onSubmeter}
        disabled={texto.trim().length < 3}
        className="rounded-xl bg-accent px-8 py-3 text-sm font-bold text-white shadow-lg shadow-accent/20 transition-all hover:scale-[1.03] hover:bg-accent-hover disabled:opacity-30 disabled:hover:scale-100"
      >
        Continuar para análise →
      </button>
    </motion.div>
  );
}

function PerguntaCard({ pergunta, index, total, onResponder, f }: {
  pergunta: PerguntaData; index: number; total: number; onResponder: (i: number) => void; f: F;
}) {
  return (
    <motion.div {...f} key={index} className="flex flex-col gap-6">
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 w-8 rounded-full transition-all duration-500 ${i <= index ? 'bg-accent' : 'bg-white/10'}`}
          />
        ))}
      </div>
      <p className="text-center text-lg font-medium text-text-primary tracking-tight">{pergunta.texto}</p>
      <div className="grid grid-cols-2 gap-3">
        {pergunta.opcoes.map((opcao, i) => (
          <button
            key={i}
            onClick={() => { onResponder(i); }}
            className="group flex flex-col items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-6 text-center transition-all hover:border-accent/40 hover:bg-accent/5"
          >
            <span className="text-3xl transition-transform group-hover:scale-110">{opcao.emoji}</span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-text-secondary group-hover:text-text-primary">{opcao.texto}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function Carregando({ f }: { f: F }) {
  return (
    <motion.div {...f} className="flex flex-col items-center gap-6 py-10">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full border-2 border-accent/20" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-accent" />
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent animate-pulse">A processar evidências…</p>
    </motion.div>
  );
}

function Limite({ onReiniciar, f }: { onReiniciar: () => void; f: F }) {
  return (
    <motion.div {...f} className="flex flex-col items-center gap-6 text-center py-6">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 border border-warning/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-warning">
        🔒 Limite Atingido
      </span>
      <h3 className="text-xl font-bold tracking-tight text-text-primary">
        Esgotaste as tuas 3 simulações gratuitas
      </h3>
      <p className="text-sm leading-relaxed text-text-secondary">
        Regista-te agora para desbloquear o teu <span className="text-accent font-bold">Perfil Vocacional Completo</span>, aceder a mentorias e explorar o catálogo sem limites.
      </p>
      <div className="flex flex-col w-full gap-3">
        <a
          href="/register"
          className="rounded-xl bg-accent px-8 py-3 text-sm font-bold text-white shadow-lg shadow-accent/20 transition-all hover:scale-[1.03] hover:bg-accent-hover"
        >
          Criar conta gratuita
        </a>
        <button
          onClick={onReiniciar}
          className="text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          Voltar ao início
        </button>
      </div>
    </motion.div>
  );
}
