import { useReducedMotion } from 'motion/react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

// ─── Animation helpers ────────────────────────────────────────────────────────

function useFadeUp() {
  const reduced = useReducedMotion();
  return {
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 32 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: { duration: 0.5, ease: 'easeOut' },
  };
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-amber">PDC</span>
          <span className="hidden text-sm text-white/50 sm:block">Por Dentro do Curso</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#problema" className="text-sm text-white/60 transition-colors hover:text-white">
            Problema
          </a>
          <a href="#como-funciona" className="text-sm text-white/60 transition-colors hover:text-white">
            Como funciona
          </a>
          <a href="#features" className="text-sm text-white/60 transition-colors hover:text-white">
            Funcionalidades
          </a>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm text-white/70 transition-colors hover:text-white"
          >
            Entrar
          </Link>
          <Link
            to="/register"
            className="rounded-lg bg-amber px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-amber-hover"
          >
            Começar grátis
          </Link>
        </div>
      </nav>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  const reduced = useReducedMotion();

  const stagger = (i: number) =>
    reduced
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3 } }
      : {
          initial: { opacity: 0, y: 32 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay: i * 0.12, ease: 'easeOut' },
        };

  return (
    <section className="flex min-h-screen flex-col items-center justify-center px-4 pt-24 pb-16 text-center sm:px-6">
      <motion.div {...stagger(0)} className="mb-4">
        <span className="inline-flex items-center gap-2 rounded-full border border-amber/30 bg-amber/10 px-4 py-1.5 text-xs font-medium text-amber">
          Plataforma educacional angolana
        </span>
      </motion.div>

      <motion.h1
        {...stagger(1)}
        className="mx-auto max-w-4xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl"
      >
        Escolhe a tua carreira com{' '}
        <span className="text-amber">evidência real</span>
      </motion.h1>

      <motion.p
        {...stagger(2)}
        className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/60"
      >
        Experimenta profissões e cursos através de simulações práticas antes de te matriculares.
        Toma a decisão certa com base no teu próprio comportamento — não em suposições.
      </motion.p>

      <motion.div {...stagger(3)} className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <Link
          to="/register"
          className="w-full rounded-xl bg-amber px-8 py-3.5 text-base font-semibold text-black transition-all hover:bg-amber-hover hover:scale-[1.02] sm:w-auto"
        >
          Começa agora — é grátis
        </Link>
        <a
          href="#como-funciona"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto"
        >
          Ver como funciona
        </a>
      </motion.div>

      {/* Stats */}
      <motion.div
        {...stagger(4)}
        className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-3"
      >
        {STATS.map((stat) => (
          <div key={stat.label} className="flex flex-col items-center gap-1">
            <span className="text-3xl font-bold text-amber">{stat.value}</span>
            <span className="text-sm text-white/50">{stat.label}</span>
          </div>
        ))}
      </motion.div>

      {/* Scroll hint */}
      <motion.div
        className="mt-16"
        animate={reduced ? {} : { y: [0, 8, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg className="h-6 w-6 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
        </svg>
      </motion.div>
    </section>
  );
}

const STATS: Array<{ value: string; label: string }> = [
  { value: '~60%', label: 'taxa de evasão no 1.º ano' },
  { value: '3 tipos', label: 'de simulações disponíveis' },
  { value: '6 roles', label: 'para todo o ecossistema' },
];

// ─── Problema ─────────────────────────────────────────────────────────────────

function Problema() {
  const fadeUp = useFadeUp();

  return (
    <section
      id="problema"
      className="bg-[#0d0d0d] px-4 py-24 sm:px-6"
    >
      <div className="mx-auto max-w-4xl">
        <motion.div {...fadeUp} className="text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-amber">
            O problema
          </span>
          <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
            Angola perde 6 em cada 10 estudantes no primeiro ano
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/60">
            Cerca de 60% dos estudantes universitários angolanos abandonam o curso no primeiro ano.
            O motivo? Escolheram sem conhecer. Sem experimentar. Sem evidência.
          </p>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {PROBLEMAS.map((item, i) => (
            <motion.div
              key={item.title}
              {...fadeUp}
              transition={{ duration: 0.5, delay: i * 0.1, ease: 'easeOut' }}
              className="rounded-2xl border border-white/5 bg-white/3 p-6"
            >
              <div className="mb-4 text-3xl">{item.icon}</div>
              <h3 className="mb-2 font-semibold text-white">{item.title}</h3>
              <p className="text-sm leading-relaxed text-white/50">{item.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

const PROBLEMAS: Array<{ icon: string; title: string; body: string }> = [
  {
    icon: '🎲',
    title: 'Escolha às cegas',
    body: 'A maioria dos estudantes escolhe o curso baseada em pressão familiar ou suposições sobre o mercado de trabalho.',
  },
  {
    icon: '💸',
    title: 'Custo humano e financeiro',
    body: 'Matricular, reprovar e abandonar desperdiça anos e recursos escassos de famílias e do Estado.',
  },
  {
    icon: '📉',
    title: 'Mercado desalinhado',
    body: 'As instituições enchem vagas que depois ficam vazias. O mercado precisa de profissionais que as escolas não conseguem reter.',
  },
];

// ─── Como funciona ────────────────────────────────────────────────────────────

function ComoFunciona() {
  const fadeUp = useFadeUp();

  return (
    <section id="como-funciona" className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <motion.div {...fadeUp} className="text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-amber">
            Como funciona
          </span>
          <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
            Três passos para uma decisão segura
          </h2>
        </motion.div>

        <div className="relative mt-16">
          {/* Connecting line (desktop) */}
          <div className="absolute left-1/2 top-8 hidden h-px w-[66%] -translate-x-1/2 bg-linear-to-r from-transparent via-amber/30 to-transparent lg:block" />

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
            {PASSOS.map((passo, i) => (
              <motion.div
                key={passo.titulo}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.15, ease: 'easeOut' }}
                className="flex flex-col items-center text-center"
              >
                <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber/30 bg-amber/10 text-2xl font-bold text-amber">
                  {i + 1}
                </div>
                <h3 className="mb-3 text-lg font-semibold text-white">{passo.titulo}</h3>
                <p className="text-sm leading-relaxed text-white/50">{passo.descricao}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const PASSOS: Array<{ titulo: string; descricao: string }> = [
  {
    titulo: 'Explora e simula',
    descricao:
      'Escolhe uma área de interesse e faz simulações práticas que replicam o dia a dia real da profissão.',
  },
  {
    titulo: 'O sistema aprende',
    descricao:
      'Cada acção tua — tempo, escolhas, resultados — gera um perfil vocacional baseado em comportamento real.',
  },
  {
    titulo: 'Decides com evidência',
    descricao:
      'Recebes um relatório vocacional personalizado com recomendações de cursos alinhadas ao teu perfil.',
  },
];

// ─── Features grid ────────────────────────────────────────────────────────────

function Features() {
  const fadeUp = useFadeUp();

  return (
    <section id="features" className="bg-[#0d0d0d] px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <motion.div {...fadeUp} className="text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-amber">
            Funcionalidades
          </span>
          <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
            Tudo o que precisas, num só lugar
          </h2>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <motion.article
              key={feature.titulo}
              {...fadeUp}
              transition={{ duration: 0.45, delay: i * 0.07, ease: 'easeOut' }}
              className="group rounded-2xl border border-white/5 bg-white/3 p-6 transition-colors hover:border-amber/20 hover:bg-amber/[0.03]"
            >
              <div className="mb-4 text-3xl">{feature.icon}</div>
              <h3 className="mb-2 font-semibold text-white">{feature.titulo}</h3>
              <p className="text-sm leading-relaxed text-white/50">{feature.descricao}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

const FEATURES: Array<{ icon: string; titulo: string; descricao: string }> = [
  {
    icon: '🧪',
    titulo: 'Simulações práticas',
    descricao: 'Três tipos de simulação — vídeo guiado, laboratório externo e ambiente interativo — para cada área profissional.',
  },
  {
    icon: '📊',
    titulo: 'Perfil Vocacional',
    descricao: 'Calculado automaticamente a partir do teu comportamento real em cada simulação, não de questionários.',
  },
  {
    icon: '🎓',
    titulo: 'Cursos com certificado',
    descricao: 'Módulos, tarefas, submissões e certificados emitidos pelas instituições parceiras.',
  },
  {
    icon: '🏛️',
    titulo: 'Experiências institucionais',
    descricao: 'Programas e experiências publicadas por universidades e escolas — gratuitas e abertas.',
  },
  {
    icon: '👨‍🏫',
    titulo: 'Mentorias reais',
    descricao: 'Conecta-te com mentores da indústria angolana para orientação personalizada na tua área.',
  },
  {
    icon: '🤖',
    titulo: 'AI Tutor',
    descricao: 'Tutor com IA que responde às tuas dúvidas com contexto do teu perfil e do conteúdo da plataforma.',
  },
];

// ─── CTA Final ────────────────────────────────────────────────────────────────

function CTAFinal() {
  const fadeUp = useFadeUp();

  return (
    <section className="px-4 py-24 sm:px-6">
      <motion.div
        {...fadeUp}
        className="mx-auto max-w-3xl overflow-hidden rounded-3xl bg-amber px-8 py-16 text-center"
      >
        <h2 className="text-3xl font-bold text-black sm:text-4xl">
          Começa hoje. Gratuito.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-base text-black/70">
          Junta-te a estudantes que já estão a tomar decisões de carreira com evidência real.
          Sem pressão, sem subscrição obrigatória.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            to="/register"
            className="w-full rounded-xl bg-black px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-black/80 hover:scale-[1.02] sm:w-auto"
          >
            Criar conta grátis
          </Link>
          <Link
            to="/login"
            className="w-full rounded-xl border border-black/20 bg-transparent px-8 py-3.5 text-base font-semibold text-black transition-colors hover:bg-black/10 sm:w-auto"
          >
            Já tenho conta
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-white/5 bg-background px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
          <div>
            <span className="text-lg font-bold text-amber">PDC</span>
            <p className="mt-1 text-xs text-white/30">Por Dentro do Curso — Angola</p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-white/40">
            <Link to="/login" className="transition-colors hover:text-white">Entrar</Link>
            <Link to="/register" className="transition-colors hover:text-white">Registar</Link>
            <a href="#problema" className="transition-colors hover:text-white">Problema</a>
            <a href="#como-funciona" className="transition-colors hover:text-white">Como funciona</a>
          </div>
        </div>
        <p className="mt-8 text-xs text-white/20">
          © {new Date().getFullYear()} Por Dentro do Curso. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background font-sans text-white antialiased">
      <Navbar />
      <main>
        <Hero />
        <Problema />
        <ComoFunciona />
        <Features />
        <CTAFinal />
      </main>
      <Footer />
    </div>
  );
}
