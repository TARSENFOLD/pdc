import { motion, useReducedMotion } from 'motion/react';
import { Circle, Briefcase, Building2, GraduationCap, Globe, Trophy, Heart, PersonStanding, DollarSign, Wrench, BookOpen, Users, MessageSquare, Palette, Bird, Stethoscope, TrendingUp, Theater, Settings, Laptop, Lightbulb, ShieldCheck, Sparkles, TreePine, Droplets, Hammer, FlaskConical, Landmark, Music, Lock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { type Area, type PerguntaData, AREA_LABEL } from './microDesafioData';
import { useMicroDesafio } from './useMicroDesafio';
import { MicroDesafioVeredito } from './MicroDesafioVeredito.tsx';

const EMOJI_ICON: Record<string, LucideIcon> = {
  // Carreira / negócio
  '💼': Briefcase,       // Trabalhar na minha área
  '🏢': Building2,       // Ter negócio próprio / Estabilidade
  '🎓': GraduationCap,   // Continuar a estudar
  '🌍': Globe,           // Ajudar a comunidade
  // Motivações
  '🏆': Trophy,          // Sucesso profissional
  '❤️': Heart,           // Impacto social
  '🧘': PersonStanding,  // Realização pessoal
  '💰': DollarSign,      // Segurança financeira
  // Aprendizagem
  '🛠️': Wrench,          // Na prática
  '📖': BookOpen,        // A ler
  '🧑‍🏫': GraduationCap, // Em aulas
  '💬': MessageSquare,   // Em grupo
  // Valores profissionais
  '🎨': Palette,         // Criatividade
  '🦅': Bird,            // Autonomia
  '👥': Users,           // Trabalho em equipa
  // Impacto
  '🏥': Stethoscope,     // Na saúde
  '📈': TrendingUp,      // Na economia
  '📚': BookOpen,        // Na educação
  '🎭': Theater,         // Na cultura
  // Outros comuns da API
  '⚙️': Settings,        // Engenharia / técnico
  '💻': Laptop,          // Tecnologia
  '🌿': TreePine,        // Natureza / sustentabilidade
  '🌊': Droplets,        // Água / ambiente
  '🔨': Hammer,          // Construção
  '🧪': FlaskConical,    // Ciência
  '🏛️': Landmark,        // Instituição / governo
  '🎵': Music,           // Arte / cultura
  '✨': Sparkles,        // Destaque / especial
  '🛡️': ShieldCheck,     // Protecção / segurança
};

function OpcaoIcon({ emoji }: { emoji: string }) {
  const Icon = EMOJI_ICON[emoji];
  if (!Icon) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`OpcaoIcon: emoji sem mapeamento "${emoji}", usando fallback`);
    }
    return <Lightbulb size={22} strokeWidth={1.5} style={{ color: 'var(--accent-terracotta, #B65F2A)' }} />;
  }
  return <Icon size={22} strokeWidth={1.5} style={{ color: 'var(--accent-terracotta, #B65F2A)' }} />;
}

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
    <div className="mx-auto mt-14 rounded-2xl backdrop-blur-lg dark:border-white/10 dark:bg-white/5" style={{ width: 'min(100%, 36rem)', borderColor: 'var(--card-border)', border: '1px solid', background: 'rgba(182,95,42,0.08)' }}>
      {/* Container de dimensões fixas — não encolhe entre fases */}
      <div className="relative flex items-center justify-center" style={{ minHeight: '380px', width: '100%' }}>
        <div className="w-full p-6 sm:p-10">
          {state.fase === 'intro' && <Intro pulso={state.pulso} onComecar={comecar} f={f} />}
          {state.fase === 'texto_livre' && (
            <TextoLivre
              texto={state.textoLivre}
              area={areaDetectada}
              onChange={setTextoLivre}
              onSubmeter={() => { void submeterTexto(); }}
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
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Intro({ pulso, onComecar, f }: { pulso: { count: number; area?: string }; onComecar: () => void; f: F }) {
  return (
    <motion.div {...f} className="flex flex-col items-center gap-6 text-center">
      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent-terracotta, #B65F2A)', border: '1px solid var(--accent-terracotta, #B65F2A)', background: 'rgba(182,95,42,0.12)' }}>
        Diagnóstico Instantâneo
      </span>
      <h3 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--ink-primary, #1A1614)' }}>
        Descobre o teu perfil vocacional em 60 segundos
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-secondary, #3A3632)' }}>
        Diz-nos o que te interessa + 5 perguntas rápidas. <br />
        <span style={{ color: 'var(--ink-tertiary, #6A6660)' }}>O PDC processa os dados em tempo real.</span>
      </p>
      {pulso.count > 0 && (
        <p className="font-mono text-[10px] uppercase tracking-widest text-text-muted opacity-80">
          <Circle size={6} aria-hidden={true} className="inline-block mr-2 fill-accent text-accent animate-pulse" />
          {pulso.count} talentos em {pulso.area ?? 'exploração'} agora
        </p>
      )}
      <button
        onClick={onComecar}
        className="mt-2 rounded-tr-2xl rounded-bl-2xl rounded-tl-sm rounded-br-sm bg-accent px-8 py-3 text-sm font-bold text-white shadow-lg shadow-accent/20 transition-all hover:scale-[1.03] hover:bg-accent-hover"
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
            {AREA_LABEL[area]} detectado
          </span>
        </div>
      )}
      <button
        onClick={onSubmeter}
        disabled={texto.trim().length < 3}
        className="rounded-tr-2xl rounded-bl-2xl rounded-tl-sm rounded-br-sm bg-accent px-8 py-3 text-sm font-bold text-white shadow-lg shadow-accent/20 transition-all hover:scale-[1.03] hover:bg-accent-hover disabled:opacity-30 disabled:hover:scale-100"
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
            className="group flex flex-col items-center gap-3 rounded-xl border-2 px-3 py-6 text-center transition-all border-black/10 bg-accent/[0.04] hover:border-accent/50 hover:bg-accent/[0.08]"
          >
            <span className="transition-transform group-hover:scale-110"><OpcaoIcon emoji={opcao.emoji} /></span>
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
        <Lock size={10} className="inline-block" /> Limite Atingido
      </span>
      <h3 className="text-xl font-bold tracking-tight text-text-primary">
        Esgotaste as tuas 3 simulações gratuitas
      </h3>
      <p className="text-sm leading-relaxed text-text-secondary">
        Regista-te agora para desbloquear o teu <span className="text-accent font-bold">Perfil Vocacional Completo</span>, aceder a mentorias e explorar o catálogo sem limites.
      </p>
      <div className="flex flex-col w-full gap-3">
        <a
          href="/criar-conta"
          className="rounded-tr-2xl rounded-bl-2xl rounded-tl-sm rounded-br-sm bg-accent px-8 py-3 text-sm font-bold text-white shadow-lg shadow-accent/20 transition-all hover:scale-[1.03] hover:bg-accent-hover"
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
