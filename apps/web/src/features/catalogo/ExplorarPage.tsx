import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type React from 'react';
import { catalogoApi } from '@/lib/api/catalogo';
import { programasApi } from '@/lib/api/programas';
import { Avatar } from '@/components/ui';
import { CardGridSkeleton } from '@/components/ui/Skeleton';
import { SEOHead } from '@/components/layout/SEOHead';
import ContentCard from '@/components/catalogo/ContentCard';
import { resolveCatalogHref } from '@/components/catalogo/catalogoLinks';
import { AspirationalEmpty } from '@/components/ui/AspirationalEmpty';
import {
  BookOpen, FlaskConical, MapPin, UserCheck,
  GraduationCap, ArrowRight, AlertCircle,
} from 'lucide-react';
import type { AreaVocacional, CursoPublico, SimulacaoPublica, ExperienciaPublica, MentorPublico, Programa } from '@pdc/shared';

const AREAS: Array<{ value: AreaVocacional; label: string }> = [
  { value: 'SAUDE', label: 'Saúde' },
  { value: 'ENGENHARIA', label: 'Engenharia' },
  { value: 'TECNOLOGIA', label: 'Tecnologia' },
  { value: 'DIREITO', label: 'Direito' },
  { value: 'GESTAO', label: 'Gestão' },
  { value: 'EDUCACAO', label: 'Educação' },
  { value: 'ARTES', label: 'Artes' },
  { value: 'CIENCIAS_AGRARIAS', label: 'Ciências Agrárias' },
  { value: 'CIENCIAS_SOCIAIS', label: 'Ciências Sociais' },
  { value: 'COMUNICACAO', label: 'Comunicação' },
  { value: 'CIENCIAS_NATURAIS', label: 'Ciências Naturais' },
  { value: 'ARQUITETURA', label: 'Arquitetura' },
  { value: 'TURISMO_HOTELARIA', label: 'Turismo e Hotelaria' },
  { value: 'DESPORTO', label: 'Desporto' },
  { value: 'OUTRA', label: 'Outra' },
];

function SectionHeader({ title, description, verTodosHref }: { title: string; description: string; verTodosHref: string }): React.JSX.Element {
  return (
    <div className="flex items-end justify-between mb-6">
      <div>
        <h2 className="text-lg font-bold text-ink-primary">{title}</h2>
        <p className="mt-0.5 text-xs text-ink-tertiary">{description}</p>
      </div>
      <Link
        to={verTodosHref}
        className="flex items-center gap-1 text-xs font-bold text-[var(--chrome-active)] hover:underline shrink-0"
      >
        Ver todos <ArrowRight size={13} />
      </Link>
    </div>
  );
}

function isAreaVocacional(value: string): value is AreaVocacional {
  return AREAS.some((area) => area.value === value);
}

function QueryError({ label }: { label: string }): React.JSX.Element {
  return (
    <AspirationalEmpty
      icon={AlertCircle}
      title="Erro ao carregar"
      description={`Não foi possível carregar ${label}. Tenta novamente.`}
    />
  );
}

const LEGACY_TIPO_ROUTES: Record<string, string> = {
  curso: 'cursos',
  experiencia: 'experiencias',
  simulacao: 'simulacoes',
  programa: 'programas',
};

export default function ExplorarPage(): React.JSX.Element {
  const [sp, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const area = sp.get('area') ?? '';
  const tipo = sp.get('tipo') ?? '';
  const inApp = location.pathname.startsWith('/app');
  const base = inApp ? '/app' : '';
  const shouldRedirect = ['curso', 'experiencia', 'simulacao', 'programa'].includes(tipo);

  // Legacy tipo redirects — anyone with old bookmarks lands in the right place
  useEffect(() => {
    const route = LEGACY_TIPO_ROUTES[tipo];
    if (route) navigate(`${base}/${route}`, { replace: true });
  }, [tipo, base, navigate]);

  const areaParam = isAreaVocacional(area) ? { area } : {};

  const cursosQ = useQuery({
    queryKey: ['explorar-cursos', area],
    queryFn: () => catalogoApi.getCursos({ ...areaParam, pageSize: 4 }),
    enabled: !shouldRedirect,
  });

  const simsQ = useQuery({
    queryKey: ['explorar-sims', area],
    queryFn: () => catalogoApi.getSimulacoes({ ...areaParam, pageSize: 4 }),
    enabled: !shouldRedirect,
  });

  const expQ = useQuery({
    queryKey: ['explorar-exp', area],
    queryFn: () => catalogoApi.getExperiencias({ ...areaParam, pageSize: 4 }),
    enabled: !shouldRedirect,
  });

  const progQ = useQuery({
    queryKey: ['explorar-prog', area],
    queryFn: () => programasApi.list({ pageSize: 4 }),
    enabled: !shouldRedirect,
  });

  const mentoresQ = useQuery({
    queryKey: ['explorar-mentores'],
    queryFn: () => catalogoApi.getMentores({ pageSize: 8 }),
    enabled: !shouldRedirect,
  });

  const setArea = (v: string) => {
    const next = new URLSearchParams(sp);
    if (v) next.set('area', v); else next.delete('area');
    setSearchParams(next, { replace: true });
  };

  const cursos = cursosQ.data?.data ?? [];
  const sims = simsQ.data?.data ?? [];
  const exps = expQ.data?.data ?? [];
  const progs = progQ.data?.data ?? [];
  const mentores = mentoresQ.data?.data ?? [];

  return (
    <div className="min-h-screen bg-canvas">
      <SEOHead
        title="Explorar"
        description="Destaques de cursos, simulações, experiências e programas da rede PDC."
        url="https://usepdc.com/explorar"
      />

      <div className="mx-auto max-w-7xl space-y-16 pb-20">
        <header className="mb-2">
          <h1 className="text-2xl font-bold text-ink-primary">Explorar</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Destaques de cada catálogo da rede PDC.
          </p>
        </header>

        {/* Filtro de área — aplica-se a todas as secções */}
        <div className="sticky top-16 md:top-20 z-10 bg-canvas/90 backdrop-blur-md pt-2 pb-3 border-b border-ink-tertiary/10 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <span className="text-[10px] font-bold uppercase tracking-widest text-ink-tertiary mr-1 shrink-0">Área:</span>
            {AREAS.map((a) => (
              <button
                key={a.value}
                type="button"
                aria-pressed={area === a.value}
                onClick={() => { setArea(area === a.value ? '' : a.value); }}
                className={`flex-none rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${area === a.value ? 'bg-[var(--chrome-active)] text-[var(--ink-on-accent)] shadow-sm' : 'text-ink-secondary hover:bg-recessed'}`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Cursos ─────────────────────────────────────────────────────── */}
        <section>
          <SectionHeader
            title="Cursos certificados"
            description="Percursos validados por especialistas e instituições de prestígio."
            verTodosHref={`${base}/cursos${area ? `?area=${area}` : ''}`}
          />
          {cursosQ.isLoading ? (
            <CardGridSkeleton />
          ) : cursosQ.isError ? (
            <QueryError label="cursos" />
          ) : cursos.length === 0 ? (
            <p className="text-sm text-ink-tertiary py-6">Nenhum curso disponível nesta área.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {cursos.map((c: CursoPublico) => (
                <ContentCard
                  key={c.id}
                  title={c.titulo}
                  subtitle={c.autorNome}
                  image={c.capaUrl || undefined}
                  href={resolveCatalogHref('curso', inApp ? c.id : c.slug, inApp)}
                  type="curso"
                  ctaLabel="Ver curso"
                  icon={BookOpen}
                  badges={[{ label: c.area || 'Geral', variant: 'info' }]}
                />
              ))}
            </div>
          )}
        </section>

        {/* ─── Simulações ─────────────────────────────────────────────────── */}
        <section>
          <SectionHeader
            title="Simulações"
            description="Vive o dilema real da profissão e mede a tua aptidão."
            verTodosHref={`${base}/simulacoes${area ? `?area=${area}` : ''}`}
          />
          {simsQ.isLoading ? (
            <CardGridSkeleton />
          ) : simsQ.isError ? (
            <QueryError label="simulações" />
          ) : sims.length === 0 ? (
            <p className="text-sm text-ink-tertiary py-6">Nenhuma simulação disponível nesta área.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {sims.map((s: SimulacaoPublica) => (
                <ContentCard
                  key={s.id}
                  title={s.titulo}
                  subtitle={s.area}
                  image={s.capaUrl || undefined}
                  href={resolveCatalogHref('simulacao', s.slug || s.id, inApp)}
                  type="simulacao"
                  ctaLabel="Experimentar"
                  icon={FlaskConical}
                  badges={[{ label: s.area, variant: 'info' }]}
                />
              ))}
            </div>
          )}
        </section>

        {/* ─── Experiências ───────────────────────────────────────────────── */}
        <section>
          <SectionHeader
            title="Experiências imersivas"
            description="Roteiros em instituições de elite para validar o teu interesse real."
            verTodosHref={`${base}/experiencias${area ? `?area=${area}` : ''}`}
          />
          {expQ.isLoading ? (
            <CardGridSkeleton />
          ) : expQ.isError ? (
            <QueryError label="experiências" />
          ) : exps.length === 0 ? (
            <p className="text-sm text-ink-tertiary py-6">Nenhuma experiência disponível nesta área.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {exps.map((e: ExperienciaPublica) => (
                <ContentCard
                  key={e.id}
                  title={e.titulo}
                  subtitle={e.instituicao?.nome || 'Instituição PDC'}
                  image={e.capaUrl || undefined}
                  href={resolveCatalogHref('experiencia', e.slug || e.id, inApp)}
                  type="experiencia"
                  ctaLabel="Ver experiência"
                  icon={MapPin}
                  badges={[{ label: e.area || 'Geral', variant: 'info' }]}
                />
              ))}
            </div>
          )}
        </section>

        {/* ─── Programas ──────────────────────────────────────────────────── */}
        <section>
          <SectionHeader
            title="Programas de acesso"
            description="Percursos integrados que ligam o conhecimento teórico à prática."
            verTodosHref={`${base}/programas`}
          />
          {progQ.isLoading ? (
            <CardGridSkeleton />
          ) : progQ.isError ? (
            <QueryError label="programas" />
          ) : progs.length === 0 ? (
            <p className="text-sm text-ink-tertiary py-6">Nenhum programa disponível de momento.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {progs.map((p: Programa) => (
                <ContentCard
                  key={p.id}
                  title={p.titulo}
                  subtitle={p.instituicaoNome || 'Instituição PDC'}
                  image={p.capaUrl || undefined}
                  href={resolveCatalogHref('programa', p.slug || p.id, inApp)}
                  type="programa"
                  ctaLabel="Ver programa"
                  icon={GraduationCap}
                  badges={[{ label: p.area, variant: 'outline' }]}
                />
              ))}
            </div>
          )}
        </section>

        {/* ─── Mentores em destaque ────────────────────────────────────────── */}
        {mentoresQ.isError ? (
          <QueryError label="mentores" />
        ) : mentores.length > 0 && (
          <section className="pt-4 border-t border-ink-tertiary/10">
            <SectionHeader
              title="Mentores em destaque"
              description="Profissionais de elite prontos para te guiar."
              verTodosHref={`${base}/mentores`}
            />
            <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
              {mentores.slice(0, 8).map((m: MentorPublico) => (
                <Link
                  key={m.id}
                  to={resolveCatalogHref('mentor', m.id, inApp)}
                  className="group flex w-36 flex-none flex-col items-center rounded-lg border border-transparent hover:bg-recessed p-4 text-center transition-all"
                >
                  <Avatar
                    size="xl"
                    {...(m.avatarUrl ? { src: m.avatarUrl } : {})}
                    alt={m.nome}
                    fallback={m.nome.substring(0, 2)}
                    className="ring-2 ring-transparent group-hover:ring-[var(--chrome-active-soft)] transition-all"
                  />
                  <p className="mt-4 text-sm font-bold text-ink-primary line-clamp-1 group-hover:text-[var(--chrome-active)] transition-colors">{m.nome}</p>
                  {m.areaEspecialidade ? (
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-ink-tertiary line-clamp-1">{m.areaEspecialidade}</p>
                  ) : null}
                  <div className="mt-4 rounded-full bg-[var(--chrome-active-soft)] px-3 py-1 text-[10px] font-bold text-[var(--chrome-active)]">
                    <UserCheck size={10} className="inline mr-1" />Conectar
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
