import { useQuery } from '@tanstack/react-query';
import { Award, Lock, Globe, User, ArrowLeft, MapPin, Briefcase } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { catalogoApi } from '@/lib/api/catalogo';
import { Spinner, Avatar, Badge, Card, Button } from '@/components/ui';
import { SEOHead } from '@/components/layout/SEOHead';
import { EmptyState } from '@/components/ui/EmptyState';


export function PerfilPublicoPage() {
  const { id } = useParams<{ id: string }>();

  const { data: res, isLoading, isError } = useQuery({
    queryKey: ['perfil-publico', id],
    queryFn: () => catalogoApi.getPerfilPublico(id ?? ''),
    enabled: !!id,
  });

  const perfil = res;

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-canvas"><Spinner size="lg" /></div>;
  if (isError || !perfil) return <div className="flex min-h-screen items-center justify-center bg-canvas p-4"><EmptyState icon={User} title="Perfil não encontrado" description="O perfil que procuras não existe ou não está disponível publicamente." /></div>;

  const roleLabel: Record<string, string> = {
    estudante: 'Estudante',
    mentor: 'Mentor Especialista',
    instituicao: 'Instituição',
    moderador: 'Moderador',
    comite_cientifico: 'Comité Científico',
    super_admin: 'Administrador',
  };

  const roleColor: Record<string, string> = {
    estudante: 'text-accent bg-accent/10 border-accent/20',
    mentor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    instituicao: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    moderador: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  };

  const linkedinLink = perfil.socialLinks.find(link => link.platform === 'linkedin');

  return (
    <div className="min-h-screen bg-canvas px-4 py-20 sm:px-8">
      <SEOHead
        title={perfil.nome}
        description={perfil.bio ?? `Perfil de ${perfil.nome} na infraestrutura de decisão PDC.`}
        image={perfil.avatarUrl}
        url={`https://usepdc.com/perfil/${id ?? ''}`}
        type="profile"
      />

      <div className="mx-auto max-w-4xl">
        <Link to="/explorar" className="group inline-flex items-center gap-2 text-sm font-bold text-ink-tertiary hover:text-accent transition-colors mb-10">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
          Voltar para Explorar
        </Link>

        <header className="relative rounded-3xl border border-ink-tertiary/10 bg-elevated p-8 sm:p-12 overflow-hidden shadow-sm">
          <div className="absolute right-0 top-0 h-40 w-40 bg-accent/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 relative z-10">
            <Avatar size="lg" {...(perfil.avatarUrl ? { src: perfil.avatarUrl } : {})} alt={perfil.nome} fallback={perfil.nome.substring(0, 2)} className="ring-4 ring-background shadow-xl" />
            
            <div className="flex-1 text-center sm:text-left">
              <div className={`inline-flex rounded-full border px-3 py-0.5 text-[10px] font-black uppercase tracking-widest mb-3 ${roleColor[perfil.role] || 'text-ink-tertiary border-ink-tertiary/10 bg-white/5'}`}>
                {roleLabel[perfil.role] || perfil.role}
              </div>
              <h1 className="text-3xl font-black tracking-tight text-ink-primary sm:text-4xl">{perfil.nome}</h1>
              
              <div className="mt-6 flex flex-wrap justify-center sm:justify-start gap-4">
                <Button className="rounded-xl px-8 font-bold">Conectar</Button>
                <Button variant="secondary" className="rounded-xl px-8 font-bold text-ink-primary">Seguir Trajetória</Button>
              </div>
            </div>
          </div>
        </header>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {perfil.bio && (
              <section className="rounded-3xl border border-ink-tertiary/10 bg-elevated p-8 shadow-sm">
                <h2 className="text-xl font-bold text-ink-primary mb-4 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Bio
                </h2>
                <p className="text-sm text-ink-secondary leading-relaxed whitespace-pre-wrap">{perfil.bio}</p>
              </section>
            )}

            <section className="rounded-3xl border border-ink-tertiary/10 bg-elevated p-8 shadow-sm">
              <h2 className="text-xl font-bold text-ink-primary mb-6 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Projetos Públicos
              </h2>
              <div className="flex flex-col items-center justify-center py-10 text-center rounded-2xl border border-dashed border-ink-tertiary/10 bg-recessed">
                <Lock size={32} className="text-ink-tertiary mb-4" />
                <h3 className="text-sm font-bold text-ink-primary">Conteúdo Restrito</h3>
                <p className="mt-2 text-xs text-ink-secondary max-w-xs mx-auto">Os projetos deste utilizador são visíveis apenas para membros registados da comunidade PDC.</p>
                <Link to="/criar-conta" className="mt-6 text-xs font-black uppercase tracking-widest text-accent hover:underline">Criar conta gratuita</Link>
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <Card className="p-6 border-ink-tertiary/10 bg-elevated shadow-sm rounded-2xl">
              <h3 className="text-sm font-black uppercase tracking-widest text-ink-tertiary mb-4">Informação</h3>
              <div className="space-y-4">
                {perfil.regiao && (
                  <div className="flex items-center gap-3 text-sm text-ink-secondary">
                    <MapPin size={16} className="text-accent" /> {perfil.regiao}
                  </div>
                )}
                {perfil.areaInteresse && (
                  <div className="flex items-center gap-3 text-sm text-ink-secondary">
                    <Briefcase size={16} className="text-accent" /> {perfil.areaInteresse}
                  </div>
                )}
              </div>

              {(perfil.website || perfil.socialLinks.length > 0) && (
                <div className="mt-8 pt-6 border-t border-ink-tertiary/10 flex gap-3">
                  {perfil.website && (
                    <a href={perfil.website} target="_blank" rel="noopener noreferrer" className="h-10 w-10 flex items-center justify-center rounded-xl bg-elevated border border-ink-tertiary/10 text-ink-tertiary hover:text-accent hover:border-accent/30 transition-all">
                      <Globe size={18} />
                    </a>
                  )}
                  {linkedinLink && (
                    <a href={linkedinLink.url} target="_blank" rel="noopener noreferrer" className="h-10 w-10 flex items-center justify-center rounded-xl bg-elevated border border-ink-tertiary/10 text-ink-tertiary hover:text-accent hover:border-accent/30 transition-all">
                      <svg fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.761 0 5-2.239 5-5v-14c0-2.761-2.239-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                    </a>
                  )}
                </div>
              )}
            </Card>

            <Card className="p-6 border-ink-tertiary/10 bg-elevated shadow-sm rounded-2xl">
              <h3 className="text-sm font-black uppercase tracking-widest text-ink-tertiary mb-4">Competências</h3>
              {perfil.areasInteresse.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {perfil.areasInteresse.map((comp) => (
                    <Badge key={comp} variant="outline" className="text-[10px] font-bold border-ink-tertiary/10 bg-white/5">{comp}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-ink-tertiary italic">Nenhuma competência listada.</p>
              )}
            </Card>

            <Card className="p-6 border-ink-tertiary/10 bg-accent/5 shadow-sm rounded-2xl border-accent/20">
              <h3 className="text-sm font-black uppercase tracking-widest text-accent mb-4 flex items-center justify-between">
                Mérito <Award size={14} />
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-secondary">Reputação</span>
                  <span className="font-bold text-ink-primary">78/100</span>
                </div>
                <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: '78%' }} />
                </div>
                <p className="text-[10px] text-ink-tertiary leading-relaxed mt-2 italic">A reputação é calculada com base na telemetria comportamental e validações do comité.</p>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
