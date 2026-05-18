import { useRef, useState } from 'react';
import type React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Camera, MapPin, Globe, MessageSquare, UserPlus, Edit3, Settings,
  Trophy, Heart, MessageCircle, ShieldCheck, Plus, Briefcase, GraduationCap,
  ChevronRight,
} from 'lucide-react';
import { Avatar, Spinner } from '@/components/ui';
import { AspirationalEmpty } from '@/components/ui/AspirationalEmpty';
import { perfisApi } from '@/lib/api/perfis';
import { mediaApi } from '@/lib/api/media';
import { useAuth } from '@/lib/auth/auth-context';
import { toast } from '@/hooks/useToast';
import { type PerfilCompleto, type HistoricoProfissional, type FormacaoAcademica } from '@pdc/shared';
import { cn } from '@/lib/utils';

const SPRING = { type: 'spring' as const, stiffness: 220, damping: 28 };

type RichPerfil = PerfilCompleto & {
  bannerUrl?: string | null | undefined;
  regiao?: string | undefined;
  website?: string | undefined;
  competencias?: string[] | undefined;
  historicoProfissional?: HistoricoProfissional[] | undefined;
  formacaoAcademica?: FormacaoAcademica[] | undefined;
};

function normalizeRichPerfil(perfil: PerfilCompleto): RichPerfil {
  return {
    ...perfil,
    bannerUrl: perfil.bannerUrl ?? null,
    regiao: perfil.regiao ?? undefined,
    website: perfil.website ?? undefined,
    conquistas: Array.isArray(perfil.conquistas) ? perfil.conquistas : [],
    competencias: Array.isArray(perfil.competencias) ? perfil.competencias : [],
    historicoProfissional: Array.isArray(perfil.historicoProfissional) ? perfil.historicoProfissional : [],
    formacaoAcademica: Array.isArray(perfil.formacaoAcademica) ? perfil.formacaoAcademica : [],
  };
}

function formatMemberSince(createdAt: string | undefined): string {
  if (!createdAt) return '—';
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric' }).format(date);
}

// ─── Shared UI Helpers ────────────────────────────────────────────────────────

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-bold text-ink-primary font-display">{children}</h2>
      {action}
    </div>
  );
}

const ROLE_LABELS: Record<string, string> = {
  estudante: 'Estudante',
  mentor: 'Mentor Especialista',
  instituicao: 'Instituição',
  moderador: 'Moderador',
  comite_cientifico: 'Comité Científico',
  super_admin: 'Administrador',
  patrocinador: 'Patrocinador',
};

const ROLE_COLORS: Record<string, string> = {
  estudante: 'text-accent bg-accent/10',
  mentor: 'text-cobalt bg-cobalt/10',
  instituicao: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
  moderador: 'text-purple-600 dark:text-purple-400 bg-purple-500/10',
  comite_cientifico: 'text-orange-500 bg-orange-500/10',
  super_admin: 'text-red-600 bg-red-500/10',
  patrocinador: 'text-yellow-600 bg-yellow-500/10',
};

function RoleBadge({ role }: { role: string }): React.JSX.Element {
  const label = ROLE_LABELS[role] ?? role;
  const color = ROLE_COLORS[role] ?? 'text-ink-secondary bg-recessed';
  return (
    <span className={cn('inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider', color)}>
      {label}
    </span>
  );
}

function CTAButtons({ role, isOwner, profileId }: { role: string; isOwner: boolean; profileId?: string | undefined }): React.JSX.Element {
  const navigate = useNavigate();

  if (isOwner) {
    return (
      <div className="flex items-center justify-center gap-2 flex-wrap w-full">
        <Link
          to="/app/perfil/editar"
          className="flex-1 inline-flex justify-center items-center gap-2 h-10 rounded-lg bg-chrome-active text-white text-sm font-bold hover:opacity-90 transition-opacity"
        >
          <Edit3 size={14} /> Editar Perfil
        </Link>
        <Link
          to="/app/configuracoes"
          className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-recessed text-ink-secondary hover:bg-elevated transition-colors"
          aria-label="Configurações"
        >
          <Settings size={15} />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { navigate('/app/vinculos'); }}
          className="flex-1 inline-flex justify-center items-center gap-2 h-10 rounded-lg bg-chrome-active text-white font-bold text-sm hover:opacity-90 transition-opacity shadow-sm"
        >
          <UserPlus size={14} /> Vincular
        </button>
        {role === 'mentor' && (
          <button
            type="button"
            onClick={() => { navigate('/app/vinculos'); }}
            className="flex-1 inline-flex justify-center items-center gap-2 h-10 rounded-lg bg-accent text-white font-bold text-sm hover:opacity-90 transition-opacity shadow-sm"
          >
            <Briefcase size={14} /> Contratar
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => { navigate(`/app/mensagens${profileId ? `?userId=${profileId}` : ''}`); }}
        className="w-full inline-flex justify-center items-center gap-2 h-10 rounded-lg border border-ink-tertiary/20 text-ink-secondary text-sm font-semibold hover:bg-recessed transition-colors"
      >
        <MessageSquare size={14} /> Mensagem
      </button>
    </div>
  );
}

// ─── List Views (No Cards) ─────────────────────────────────────────────────────

function ExpList({ items, isOwner }: { items: HistoricoProfissional[]; isOwner: boolean }) {
  if (items.length === 0 && !isOwner) return <p className="text-sm text-ink-tertiary">Nenhuma experiência partilhada.</p>;
  return (
    <div className="space-y-6">
      <SectionTitle
        action={isOwner && (
          <Link to="/app/perfil/editar" className="text-accent hover:opacity-70 transition-opacity" aria-label="Editar experiência">
            <Plus size={16} />
          </Link>
        )}
      >
        Experiência Profissional
      </SectionTitle>
      
      {items.length > 0 ? (
        <div className="space-y-6">
          {items.map((exp) => (
            <div key={exp.id} className="flex gap-4">
              <div className="h-10 w-10 rounded-lg bg-chrome-active/[0.07] flex items-center justify-center shrink-0">
                <Briefcase size={16} className="text-chrome-active" />
              </div>
              <div className="flex-1 min-w-0 pb-6 border-b border-ink-tertiary/10 last:border-0 last:pb-0">
                <p className="text-base font-bold text-ink-primary leading-tight truncate">{exp.cargo}</p>
                <p className="text-sm text-ink-secondary truncate mt-0.5">{exp.empresa}</p>
                <p className="text-xs text-ink-tertiary mt-1">
                  {exp.inicio}{exp.atual ? ' · Atual' : exp.fim ? ` – ${exp.fim}` : ''}
                </p>
                {exp.descricao && <p className="text-sm text-ink-secondary mt-3 leading-relaxed">{exp.descricao}</p>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Link to="/app/perfil/editar" className="flex items-center gap-2 text-sm text-ink-tertiary hover:text-accent transition-colors">
          <Plus size={14} /> Adicionar experiência
        </Link>
      )}
    </div>
  );
}

function EduList({ items, isOwner }: { items: FormacaoAcademica[]; isOwner: boolean }) {
  if (items.length === 0 && !isOwner) return <p className="text-sm text-ink-tertiary">Nenhuma formação partilhada.</p>;
  return (
    <div className="space-y-6">
      <SectionTitle
        action={isOwner && (
          <Link to="/app/perfil/editar" className="text-accent hover:opacity-70 transition-opacity" aria-label="Editar educação">
            <Plus size={16} />
          </Link>
        )}
      >
        Formação Académica
      </SectionTitle>

      {items.length > 0 ? (
        <div className="space-y-6">
          {items.map((edu) => (
            <div key={edu.id} className="flex gap-4">
              <div className="h-10 w-10 rounded-lg bg-accent/[0.07] flex items-center justify-center shrink-0">
                <GraduationCap size={16} className="text-accent" />
              </div>
              <div className="flex-1 min-w-0 pb-6 border-b border-ink-tertiary/10 last:border-0 last:pb-0">
                <p className="text-base font-bold text-ink-primary leading-tight truncate">{edu.grau}</p>
                <p className="text-sm text-ink-secondary truncate mt-0.5">{edu.instituicao}</p>
                {edu.area && <p className="text-xs text-ink-tertiary mt-1">{edu.area}</p>}
                <p className="text-xs text-ink-tertiary mt-0.5">
                  {edu.inicio}{edu.atual ? ' · A frequentar' : edu.fim ? ` – ${edu.fim}` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Link to="/app/perfil/editar" className="flex items-center gap-2 text-sm text-ink-tertiary hover:text-accent transition-colors">
          <Plus size={14} /> Adicionar formação
        </Link>
      )}
    </div>
  );
}

function CertList({ items, isOwner }: { items: Array<{ id: string; titulo: string; icone?: string | undefined; slug?: string | undefined }>; isOwner: boolean }): React.JSX.Element {
  if (items.length === 0 && !isOwner) return <p className="text-sm text-ink-tertiary">Nenhuma certificação partilhada.</p>;
  return (
    <div className="space-y-6">
      <SectionTitle
        action={(
          <Link to="/app/conquistas" className="text-ink-tertiary hover:text-accent transition-colors text-sm font-medium flex items-center gap-1" aria-label="Ver conquistas">
            Ver todas <ChevronRight size={14} />
          </Link>
        )}
      >
        Certificações PDC
      </SectionTitle>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg bg-recessed/50 hover:bg-elevated transition-colors border border-transparent hover:border-ink-tertiary/10">
              <div className="h-10 w-10 rounded-lg bg-accent/[0.07] flex items-center justify-center shrink-0 text-lg leading-none">
                {c.icone ? <span>{c.icone}</span> : <Trophy size={18} className="text-accent" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-ink-primary leading-snug truncate">{c.titulo}</p>
                <div className="flex items-center gap-1 mt-1">
                  <ShieldCheck size={12} className="text-accent shrink-0" />
                  <span className="text-[10px] font-bold text-accent uppercase tracking-wide">PDC Verificado</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-ink-tertiary leading-relaxed">Conquistas e certificações PDC aparecerão aqui.</p>
          <Link to="/app/conquistas" className="inline-flex items-center gap-1.5 text-sm font-bold text-accent hover:underline">
            <Plus size={14} /> Ver conquistas disponíveis
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PerfilShowcase(): React.JSX.Element {
  const { id: paramId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [activeTab, setActiveTab] = useState<'visao_geral' | 'experiencia' | 'educacao' | 'certificacoes'>('visao_geral');

  const { data: perfil, isLoading, isError } = useQuery({
    queryKey: ['perfil', paramId ?? 'me'],
    queryFn: () => (paramId ? perfisApi.getById(paramId) : perfisApi.getMe()),
  });

  const isOwner = !paramId || (user?.id !== undefined && perfil?.id !== undefined && user.id === perfil.id);

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Ficheiro demasiado grande', description: 'O banner deve ter menos de 5MB.', variant: 'error' });
      return;
    }
    setIsUploadingBanner(true);
    try {
      const uploadRes = await mediaApi.upload(file);
      await perfisApi.update({ bannerUrl: uploadRes.url });
      void qc.invalidateQueries({ queryKey: ['perfil'] });
      void qc.invalidateQueries({ queryKey: ['perfis', 'me'] });
      toast({ title: 'Banner atualizado!' });
    } catch (error) {
      console.error('Erro ao atualizar banner', error);
      toast({ title: 'Erro ao atualizar banner', variant: 'error' });
    } finally {
      setIsUploadingBanner(false);
    }
  };

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;
  }

  if (isError || !perfil) {
    return (
      <AspirationalEmpty
        icon={Trophy}
        title="Perfil não encontrado"
        description="O perfil que procuras não existe ou não está disponível publicamente."
      />
    );
  }

  const p = normalizeRichPerfil(perfil);
  const initials = p.nome.charAt(0).toUpperCase();
  const conquistas = Array.isArray(p.conquistas) ? p.conquistas : [];
  const areasInteresse = Array.isArray(p.areasInteresse) ? p.areasInteresse : [];
  const competencias = Array.isArray(p.competencias) ? p.competencias : [];
  const allTags = [...new Set([...areasInteresse, ...competencias])];
  const experiencias: HistoricoProfissional[] = Array.isArray(p.historicoProfissional) ? p.historicoProfissional : [];
  const educacao: FormacaoAcademica[] = Array.isArray(p.formacaoAcademica) ? p.formacaoAcademica : [];

  const feedItems = conquistas.map((c) => ({
    id: c.id,
    titulo: c.titulo,
    tags: allTags.slice(0, 2),
  }));

  const tabs = [
    { id: 'visao_geral', label: 'Visão Geral' },
    { id: 'experiencia', label: `Experiência (${String(experiencias.length)})` },
    { id: 'educacao', label: `Formação (${String(educacao.length)})` },
    { id: 'certificacoes', label: `Certificações (${String(conquistas.length)})` },
  ] as const;

  return (
    <div className="max-w-6xl mx-auto pb-20">
      {/* ── BANNER ── */}
      <div className="relative h-48 md:h-64 w-full group overflow-hidden">
        {p.bannerUrl ? (
          <img src={p.bannerUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#12304A] via-[#1e4d80] to-[#0d2438] relative overflow-hidden">
            <svg className="absolute inset-0 w-full h-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="pdots" width="28" height="28" patternUnits="userSpaceOnUse">
                  <circle cx="14" cy="14" r="1.5" fill="white" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#pdots)" />
            </svg>
          </div>
        )}

        {isOwner && (
          <>
            <button
              type="button"
              onClick={() => { bannerInputRef.current?.click(); }}
              disabled={isUploadingBanner}
              className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 disabled:cursor-wait"
              aria-label="Alterar banner"
            >
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg text-white text-sm font-bold shadow-lg">
                {isUploadingBanner ? (
                  <Spinner size="sm" className="text-white" />
                ) : (
                  <><Camera size={16} /> Alterar Banner</>
                )}
              </div>
            </button>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { void handleBannerUpload(e); }}
            />
          </>
        )}
      </div>

      {/* ── MAIN CONTENT GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 px-6 lg:px-10">
        
        {/* ── LEFT COLUMN (Sidebar Flutuante) ── */}
        <div className="-mt-16 lg:-mt-24 relative z-10 space-y-8">
          {/* Profile Card */}
          <div className="bg-elevated rounded-lg shadow-sm border border-ink-tertiary/[0.08] p-6 text-center">
            <div className="relative inline-block mb-4">
              <div className="h-40 w-40 rounded-full ring-4 ring-elevated overflow-hidden bg-canvas">
                <Avatar
                  src={p.avatarUrl ?? undefined}
                  fallback={initials}
                  tier={p.reputacaoTier}
                  className="h-full w-full border-0 ring-0"
                />
              </div>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-ink-primary font-display leading-tight mb-1">
              {p.nome}
            </h1>
            
            {p.headline && (
              <p className="text-sm text-ink-secondary mb-3">{p.headline}</p>
            )}

            <div className="flex items-center justify-center gap-2 mb-4">
              <RoleBadge role={p.role} />
            </div>

            {(p.regiao || p.website) && (
              <div className="flex flex-col gap-2 text-sm text-ink-tertiary mb-6">
                {p.regiao && (
                  <div className="flex items-center justify-center gap-1.5">
                    <MapPin size={14} /> {p.regiao}
                  </div>
                )}
                {p.website && (
                  <a href={p.website} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 text-accent hover:underline">
                    <Globe size={14} /> Website
                  </a>
                )}
              </div>
            )}

            <CTAButtons role={p.role} isOwner={isOwner} profileId={paramId} />
          </div>

          {/* Competências List (Sem box, limpo) */}
          <div className="px-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-ink-primary uppercase tracking-wider">Especialista em:</h3>
              {isOwner && (
                <Link to="/app/perfil/editar" className="text-accent hover:opacity-70 transition-opacity">
                  <Plus size={14} />
                </Link>
              )}
            </div>
            
            {allTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1.5 rounded-md text-xs font-medium bg-recessed text-ink-secondary border border-ink-tertiary/10"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-tertiary">
                {isOwner ? 'Adiciona as tuas competências.' : 'Nenhuma competência listada.'}
              </p>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN (Tabs & Content) ── */}
        <div className="pt-6 lg:pt-8 min-w-0">
          
          {/* Tabs Nav */}
          <div className="flex items-center gap-6 border-b border-ink-tertiary/10 mb-8 overflow-x-auto hide-scrollbar pb-px">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); }}
                className={cn(
                  "pb-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2",
                  activeTab === tab.id
                    ? "border-chrome-active text-ink-primary"
                    : "border-transparent text-ink-tertiary hover:text-ink-secondary hover:border-ink-tertiary/20"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tabs Content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={SPRING}
          >
            {activeTab === 'visao_geral' && (
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-10">
                {/* Left col of Visão Geral */}
                <div className="space-y-10">
                  {/* Sobre */}
                  <section>
                    <SectionTitle>Sobre mim</SectionTitle>
                    {p.bio ? (
                      <p className="text-base text-ink-secondary leading-relaxed whitespace-pre-wrap">{p.bio}</p>
                    ) : (
                      <p className="text-sm text-ink-tertiary italic">
                        {isOwner
                          ? <><Link to="/app/perfil/editar" className="text-accent hover:underline">Adiciona a tua bio</Link> para apresentares à comunidade.</>
                          : 'Sem bio disponível.'}
                      </p>
                    )}
                  </section>

                  {/* Feed */}
                  <section>
                    <SectionTitle>Atividade da Comunidade</SectionTitle>
                    {feedItems.length > 0 ? (
                      <div className="space-y-5">
                        {feedItems.map((item) => (
                          <article key={item.id} className="flex gap-4">
                            <Avatar
                              src={p.avatarUrl ?? undefined}
                              fallback={initials}
                              size="sm"
                              tier={p.reputacaoTier}
                              className="shrink-0 mt-1"
                            />
                            <div className="flex-1 bg-recessed/50 rounded-lg p-4 border border-ink-tertiary/5">
                              <p className="text-sm text-ink-secondary leading-snug mb-2">
                                desbloqueou a conquista{' '}
                                <strong className="text-ink-primary font-semibold">"{item.titulo}"</strong>
                              </p>
                              {item.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                  {item.tags.map((tag) => (
                                    <span key={tag} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-accent/10 text-accent uppercase tracking-wide">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="flex items-center gap-4 text-xs text-ink-tertiary">
                                <button type="button" disabled className="flex items-center gap-1.5 opacity-50 cursor-not-allowed" aria-label="Gosto indisponível">
                                  <Heart size={14} aria-hidden={true} /> Gosto
                                </button>
                                <button type="button" disabled className="flex items-center gap-1.5 opacity-50 cursor-not-allowed" aria-label="Comentário indisponível">
                                  <MessageCircle size={14} aria-hidden={true} /> Comentar
                                </button>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center bg-recessed/30 rounded-lg border border-ink-tertiary/5">
                        <Trophy size={24} className="text-ink-tertiary mx-auto mb-2" strokeWidth={1.5} />
                        <p className="text-sm text-ink-secondary">Sem atividade recente</p>
                      </div>
                    )}
                  </section>
                </div>

                {/* Right col of Visão Geral */}
                <div className="space-y-8">
                  {/* Informação */}
                  <section className="bg-recessed/30 rounded-lg p-5 border border-ink-tertiary/5">
                    <h3 className="text-sm font-bold text-ink-primary uppercase tracking-wider mb-4">Métricas do PDC</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-ink-tertiary">Nível PDC</span>
                        <span className="font-bold text-ink-primary">{p.reputacaoTier}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-ink-tertiary">Reputação</span>
                        <span className="font-bold text-ink-primary">{p.reputacao} pts</span>
                      </div>
                      <div className="flex items-center justify-between text-sm pt-3 border-t border-ink-tertiary/10">
                        <span className="text-ink-tertiary">Membro desde</span>
                        <span className="font-medium text-ink-secondary">{formatMemberSince(p.createdAt)}</span>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            )}

            {activeTab === 'experiencia' && <ExpList items={experiencias} isOwner={isOwner} />}
            {activeTab === 'educacao' && <EduList items={educacao} isOwner={isOwner} />}
            {activeTab === 'certificacoes' && <CertList items={conquistas} isOwner={isOwner} />}
          </motion.div>

        </div>
      </div>
    </div>
  );
}
