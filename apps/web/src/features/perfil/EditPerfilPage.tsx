import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Camera, Plus, Trash2, X, Save, ExternalLink,
  User, Award, Briefcase, GraduationCap, Globe, ChevronRight,
} from 'lucide-react';
import { Spinner, Button, Input } from '@/components/ui';
import { Avatar } from '@/components/ui';
import { ProfilePhotoUpload } from './ProfilePhotoUpload';
import { perfisApi } from '@/lib/api/perfis';
import { mediaApi } from '@/lib/api/media';
import { toast } from '@/hooks/useToast';
import {
  type UpdatePerfilPayload, type PerfilCompleto,
  type HistoricoProfissional, type FormacaoAcademica,
} from '@pdc/shared';
import { cn } from '@/lib/utils';

const SPRING = { type: 'spring' as const, stiffness: 220, damping: 28 };

type Section = 'identidade' | 'basico' | 'competencias' | 'experiencia' | 'educacao' | 'social';

const SECTIONS: Array<{ id: Section; label: string; description: string; icon: React.ElementType }> = [
  { id: 'identidade', label: 'Identidade Visual', description: 'Banner e foto de perfil', icon: Camera },
  { id: 'basico', label: 'Informações Básicas', description: 'Nome, headline, bio e localização', icon: User },
  { id: 'competencias', label: 'Competências', description: 'Skills e áreas de interesse', icon: Award },
  { id: 'experiencia', label: 'Experiência', description: 'Cargos e empresas', icon: Briefcase },
  { id: 'educacao', label: 'Educação', description: 'Graus e formações académicas', icon: GraduationCap },
  { id: 'social', label: 'Redes Sociais', description: 'Links para perfis externos', icon: Globe },
];

type RichPerfil = PerfilCompleto & {
  bannerUrl?: string | null | undefined;
  regiao?: string | undefined;
  website?: string | undefined;
  competencias?: string[] | undefined;
  socialLinks?: Array<{ platform: string; url: string }> | undefined;
  historicoProfissional?: HistoricoProfissional[] | undefined;
  formacaoAcademica?: FormacaoAcademica[] | undefined;
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isSocialLinks(value: unknown): value is Array<{ platform: string; url: string }> {
  return Array.isArray(value) && value.every((item) => {
    if (typeof item !== 'object' || item === null) return false;
    const candidate = item as Record<string, unknown>;
    return typeof candidate.platform === 'string' && typeof candidate.url === 'string';
  });
}

function isHistoricoProfissionalArray(value: unknown): value is HistoricoProfissional[] {
  return Array.isArray(value) && value.every((item) =>
    typeof item === 'object' && item !== null && 'id' in item && 'cargo' in item && 'empresa' in item
  );
}

function isFormacaoAcademicaArray(value: unknown): value is FormacaoAcademica[] {
  return Array.isArray(value) && value.every((item) =>
    typeof item === 'object' && item !== null && 'id' in item && 'grau' in item && 'instituicao' in item
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TagInput({
  label, placeholder, tags, onChange,
}: { label: string; placeholder?: string; tags: string[]; onChange: (tags: string[]) => void }) {
  const [val, setVal] = useState('');

  const add = (raw: string) => {
    const t = raw.trim();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setVal('');
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold uppercase tracking-widest text-ink-tertiary">{label}</label>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-chrome-active/[0.07] text-chrome-active border border-chrome-active/10"
            >
              {tag}
              <button
                type="button"
                onClick={() => { onChange(tags.filter((t) => t !== tag)); }}
                className="hover:text-error transition-colors"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={val}
          onChange={(e) => { setVal(e.target.value); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(val); } }}
          placeholder={placeholder ?? `Adicionar ${label.toLowerCase()}... (Enter para confirmar)`}
          className="flex-1 rounded-xl border border-ink-tertiary/20 bg-recessed px-3 py-2 text-sm text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
        />
        <button
          type="button"
          onClick={() => { add(val); }}
          className="h-10 w-10 rounded-xl bg-chrome-active text-white flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          <Plus size={15} />
        </button>
      </div>
    </div>
  );
}

const PLATFORM_OPTIONS = ['LinkedIn', 'GitHub', 'Twitter/X', 'Instagram', 'YouTube', 'Website', 'Outro'];

function SocialLinksEditor({
  links, onChange,
}: { links: Array<{ platform: string; url: string }>; onChange: (v: Array<{ platform: string; url: string }>) => void }) {
  const [newPlatform, setNewPlatform] = useState('LinkedIn');
  const [newUrl, setNewUrl] = useState('');

  const add = () => {
    const trimmed = newUrl.trim();
    if (!trimmed) return;
    onChange([...links, { platform: newPlatform, url: trimmed }]);
    setNewUrl('');
  };

  return (
    <div className="space-y-3">
      {links.map((link, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-recessed border border-ink-tertiary/[0.06]">
          <span className="text-xs font-bold text-ink-secondary w-20 shrink-0">{link.platform}</span>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-sm text-accent hover:underline truncate flex items-center gap-1"
          >
            {link.url.replace(/^https?:\/\/(www\.)?/, '')}
            <ExternalLink size={10} />
          </a>
          <button
            type="button"
            onClick={() => { onChange(links.filter((_, idx) => idx !== i)); }}
            className="h-8 w-8 rounded-lg bg-error/10 text-error flex items-center justify-center hover:bg-error/20 transition-colors shrink-0"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      <div className="flex gap-2 flex-wrap sm:flex-nowrap">
        <select
          value={newPlatform}
          onChange={(e) => { setNewPlatform(e.target.value); }}
          className="rounded-xl border border-ink-tertiary/20 bg-recessed px-3 py-2 text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent shrink-0"
        >
          {PLATFORM_OPTIONS.map((p) => <option key={p}>{p}</option>)}
        </select>
        <input
          type="url"
          value={newUrl}
          onChange={(e) => { setNewUrl(e.target.value); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="https://..."
          className="flex-1 min-w-0 rounded-xl border border-ink-tertiary/20 bg-recessed px-3 py-2 text-sm text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
        />
        <button
          type="button"
          onClick={add}
          className="h-10 px-4 rounded-xl bg-chrome-active text-white text-sm font-bold hover:opacity-90 transition-opacity shrink-0"
        >
          Adicionar
        </button>
      </div>
    </div>
  );
}

function ExperienciaForm({
  initial, onSave, onCancel,
}: { initial?: Partial<HistoricoProfissional>; onSave: (v: HistoricoProfissional) => void; onCancel: () => void }) {
  const initialForm: Partial<HistoricoProfissional> = initial ?? {};
  const [form, setForm] = useState(initialForm);

  const set = (k: keyof HistoricoProfissional, v: string | boolean) => {
    setForm((prev) => ({ ...prev, [k]: v }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cargo?.trim() || !form.empresa?.trim() || !form.inicio?.trim()) {
      toast({ title: 'Preenche cargo, empresa e data de início', variant: 'error' });
      return;
    }
    onSave({
      id: form.id ?? crypto.randomUUID(),
      cargo: form.cargo,
      empresa: form.empresa,
      inicio: form.inicio,
      fim: form.fim,
      atual: form.atual ?? false,
      descricao: form.descricao,
    });
  };

  return (
    <form onSubmit={submit} className="bg-recessed rounded-xl p-4 border border-chrome-active/10 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Cargo *" value={form.cargo ?? ''} onChange={(e) => { set('cargo', e.target.value); }} placeholder="ex: Desenvolvedor Full Stack" />
        <Input label="Empresa *" value={form.empresa ?? ''} onChange={(e) => { set('empresa', e.target.value); }} placeholder="ex: Empresa Lda." />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Início *" value={form.inicio ?? ''} onChange={(e) => { set('inicio', e.target.value); }} placeholder="ex: Jan 2022" />
        <Input label="Fim" value={form.fim ?? ''} onChange={(e) => { set('fim', e.target.value); }} placeholder="ex: Dez 2023" disabled={form.atual === true} />
      </div>
      <label className="flex items-center gap-2 text-sm text-ink-secondary cursor-pointer">
        <input
          type="checkbox"
          checked={form.atual ?? false}
          onChange={(e) => { set('atual', e.target.checked); if (e.target.checked) set('fim', ''); }}
          className="rounded"
        />
        Trabalho atual
      </label>
      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-widest text-ink-tertiary">Descrição</label>
        <textarea
          value={form.descricao ?? ''}
          onChange={(e) => { set('descricao', e.target.value); }}
          rows={2}
          placeholder="Descreve as tuas responsabilidades..."
          className="w-full rounded-xl border border-ink-tertiary/20 bg-canvas px-3 py-2 text-sm text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-accent resize-none"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" size="sm">Guardar</Button>
      </div>
    </form>
  );
}

function EducacaoForm({
  initial, onSave, onCancel,
}: { initial?: Partial<FormacaoAcademica>; onSave: (v: FormacaoAcademica) => void; onCancel: () => void }) {
  const initialForm: Partial<FormacaoAcademica> = initial ?? {};
  const [form, setForm] = useState(initialForm);

  const set = (k: keyof FormacaoAcademica, v: string | boolean) => {
    setForm((prev) => ({ ...prev, [k]: v }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.grau?.trim() || !form.instituicao?.trim() || !form.inicio?.trim()) {
      toast({ title: 'Preenche grau, instituição e data de início', variant: 'error' });
      return;
    }
    onSave({
      id: form.id ?? crypto.randomUUID(),
      grau: form.grau,
      instituicao: form.instituicao,
      area: form.area,
      inicio: form.inicio,
      fim: form.fim,
      atual: form.atual ?? false,
    });
  };

  return (
    <form onSubmit={submit} className="bg-recessed rounded-xl p-4 border border-chrome-active/10 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Grau / Nível *" value={form.grau ?? ''} onChange={(e) => { set('grau', e.target.value); }} placeholder="ex: Licenciatura, MBA" />
        <Input label="Instituição *" value={form.instituicao ?? ''} onChange={(e) => { set('instituicao', e.target.value); }} placeholder="ex: Universidade Agostinho Neto" />
      </div>
      <Input label="Área de Estudo" value={form.area ?? ''} onChange={(e) => { set('area', e.target.value); }} placeholder="ex: Engenharia Informática" />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Início *" value={form.inicio ?? ''} onChange={(e) => { set('inicio', e.target.value); }} placeholder="ex: 2020" />
        <Input label="Fim" value={form.fim ?? ''} onChange={(e) => { set('fim', e.target.value); }} placeholder="ex: 2024" disabled={form.atual === true} />
      </div>
      <label className="flex items-center gap-2 text-sm text-ink-secondary cursor-pointer">
        <input
          type="checkbox"
          checked={form.atual ?? false}
          onChange={(e) => { set('atual', e.target.checked); if (e.target.checked) set('fim', ''); }}
          className="rounded"
        />
        A frequentar atualmente
      </label>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" size="sm">Guardar</Button>
      </div>
    </form>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EditPerfilPage(): React.JSX.Element | null {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>('identidade');

  const { data: perfil, isLoading } = useQuery({
    queryKey: ['perfil', 'me'],
    queryFn: () => perfisApi.getMe(),
  });

  const mutation = useMutation({
    mutationFn: (data: UpdatePerfilPayload) => perfisApi.update(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['perfil'] });
      void qc.invalidateQueries({ queryKey: ['perfis', 'me'] });
      toast({ title: 'Guardado com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao guardar', variant: 'error' });
    },
  });

  const save = (data: UpdatePerfilPayload) => { mutation.mutate(data); };

  const [basicInfo, setBasicInfo] = useState({ nome: '', headline: '', bio: '', regiao: '', website: '' });
  const [competencias, setCompetencias] = useState<string[]>([]);
  const [areasInteresse, setAreasInteresse] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState<Array<{ platform: string; url: string }>>([]);
  const [experiencias, setExperiencias] = useState<HistoricoProfissional[]>([]);
  const [educacao, setEducacao] = useState<FormacaoAcademica[]>([]);
  const [showExpForm, setShowExpForm] = useState(false);
  const [showEduForm, setShowEduForm] = useState(false);

  useEffect(() => {
    if (!isLoading && !perfil) {
      navigate('/app/perfil');
    }
  }, [isLoading, perfil, navigate]);

  useEffect(() => {
    if (!perfil) return;
    const p: RichPerfil = perfil;
    setBasicInfo({
      nome: p.nome,
      headline: p.headline ?? '',
      bio: p.bio ?? '',
      regiao: p.regiao ?? '',
      website: p.website ?? '',
    });
    setCompetencias(isStringArray(p.competencias) ? p.competencias : []);
    setAreasInteresse(isStringArray(p.areasInteresse) ? p.areasInteresse : []);
    setSocialLinks(isSocialLinks(p.socialLinks) ? p.socialLinks : []);
    setExperiencias(isHistoricoProfissionalArray(p.historicoProfissional) ? p.historicoProfissional : []);
    setEducacao(isFormacaoAcademicaArray(p.formacaoAcademica) ? p.formacaoAcademica : []);
  }, [perfil]);

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
      const res = await mediaApi.upload(file, 'capa');
      save({ bannerUrl: res.url });
    } catch (error) {
      console.error('Banner upload failed:', error);
      toast({ title: 'Erro ao atualizar banner', variant: 'error' });
    } finally {
      setIsUploadingBanner(false);
    }
  };

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;
  }

  if (!perfil) {
    return null;
  }

  const p: RichPerfil = perfil;
  const initials = p.nome.charAt(0).toUpperCase();
  const active = SECTIONS.find((s) => s.id === activeSection) ?? { id: 'identidade' as const, label: 'Identidade Visual', description: 'Banner e foto de perfil', icon: Camera };

  return (
    <div className="max-w-5xl mx-auto pb-16">
      {/* ── Sticky top bar ── */}
      <div className="sticky top-0 z-20 bg-canvas/90 backdrop-blur-sm border-b border-ink-tertiary/[0.08] -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 mb-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/app/perfil"
              className="group h-9 w-9 rounded-xl border border-ink-tertiary/20 bg-elevated flex items-center justify-center hover:bg-recessed transition-colors shrink-0"
            >
              <ArrowLeft size={15} className="text-ink-secondary group-hover:-translate-x-0.5 transition-transform" />
            </Link>
            <div className="min-w-0">
              <h1 className="font-display text-lg font-black text-ink-primary tracking-tight leading-tight">Editar Perfil</h1>
              <p className="text-xs text-ink-tertiary truncate hidden sm:block">{active.description}</p>
            </div>
          </div>
          <Link
            to="/app/perfil"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-secondary hover:text-accent transition-colors shrink-0"
          >
            Ver perfil <ExternalLink size={12} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5">
        {/* ── Sidebar ── */}
        <aside className="space-y-1">
          {/* Profile mini-card */}
          <div className="bg-elevated rounded-2xl border border-ink-tertiary/[0.08] p-4 mb-3 shadow-sm">
            <div className="flex items-center gap-3">
              <Avatar
                src={p.avatarUrl ?? undefined}
                fallback={initials}
                tier={p.reputacaoTier}
                size="sm"
                className="shrink-0"
              />
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink-primary truncate leading-tight">{p.nome}</p>
                {p.headline && (
                  <p className="text-xs text-ink-tertiary truncate mt-0.5">{p.headline}</p>
                )}
              </div>
            </div>
          </div>

          {/* Nav items */}
          <nav className="space-y-0.5">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => { setActiveSection(id); }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all text-left',
                  activeSection === id
                    ? 'bg-chrome-active text-white shadow-sm'
                    : 'text-ink-secondary hover:bg-recessed hover:text-ink-primary',
                )}
              >
                <Icon size={15} className="shrink-0" />
                <span className="truncate">{label}</span>
                {activeSection === id && <ChevronRight size={13} className="ml-auto shrink-0 opacity-60" />}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Content area ── */}
        <main className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={SPRING}
              className="bg-elevated rounded-2xl border border-ink-tertiary/[0.08] shadow-sm overflow-hidden"
            >
              {/* Section header */}
              <div className="px-6 py-5 border-b border-ink-tertiary/[0.06] flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-chrome-active/[0.08] flex items-center justify-center shrink-0">
                  <active.icon size={16} className="text-chrome-active" />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.12em] text-ink-primary">{active.label}</h2>
                  <p className="text-xs text-ink-tertiary mt-0.5">{active.description}</p>
                </div>
              </div>

              <div className="p-6">
                {/* ── IDENTIDADE VISUAL ── */}
                {activeSection === 'identidade' && (
                  <div className="space-y-5">
                    {/* Banner */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-ink-tertiary mb-2">Banner</label>
                      <div className="relative h-40 rounded-xl overflow-hidden group">
                        {p.bannerUrl ? (
                          <img src={p.bannerUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#12304A] via-[#1e4d80] to-[#0d2438] relative overflow-hidden">
                            <svg className="absolute inset-0 w-full h-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
                              <defs>
                                <pattern id="editdots" width="28" height="28" patternUnits="userSpaceOnUse">
                                  <circle cx="14" cy="14" r="1.5" fill="white" />
                                </pattern>
                              </defs>
                              <rect width="100%" height="100%" fill="url(#editdots)" />
                            </svg>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => { bannerInputRef.current?.click(); }}
                          disabled={isUploadingBanner}
                          className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 disabled:cursor-wait"
                        >
                          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-4 py-2.5 rounded-full text-white text-sm font-bold">
                            {isUploadingBanner ? <Spinner size="sm" className="text-white" /> : <><Camera size={14} /> Alterar Banner</>}
                          </div>
                        </button>
                        <input
                          ref={bannerInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => { void handleBannerUpload(e); }}
                        />
                      </div>
                      <p className="text-xs text-ink-tertiary mt-1.5">Recomendado: 1500×500px, máx 5MB. Passe o cursor para editar.</p>
                    </div>
                    {/* Avatar */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-ink-tertiary mb-2">Foto de Perfil</label>
                      <ProfilePhotoUpload currentUrl={p.avatarUrl} />
                    </div>
                  </div>
                )}

                {/* ── INFORMAÇÕES BÁSICAS ── */}
                {activeSection === 'basico' && (
                  <form
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      save({
                        nome: basicInfo.nome || undefined,
                        headline: basicInfo.headline || undefined,
                        bio: basicInfo.bio || undefined,
                        regiao: basicInfo.regiao || undefined,
                        website: basicInfo.website || undefined,
                      });
                    }}
                  >
                    <Input
                      label="Nome Completo"
                      value={basicInfo.nome}
                      onChange={(e) => { setBasicInfo((prev) => ({ ...prev, nome: e.target.value })); }}
                      placeholder="O teu nome completo"
                    />
                    <Input
                      label="Headline Profissional"
                      value={basicInfo.headline}
                      onChange={(e) => { setBasicInfo((prev) => ({ ...prev, headline: e.target.value })); }}
                      placeholder="ex: Desenvolvedor Full Stack | IA & Dados"
                    />
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-widest text-ink-tertiary">Biografia</label>
                      <textarea
                        value={basicInfo.bio}
                        onChange={(e) => { setBasicInfo((prev) => ({ ...prev, bio: e.target.value })); }}
                        rows={5}
                        maxLength={1000}
                        placeholder="Apresenta-te à comunidade PDC..."
                        className="w-full rounded-xl border border-ink-tertiary/20 bg-recessed px-3 py-2.5 text-sm text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                      />
                      <p className={cn('text-[10px] text-right', basicInfo.bio.length > 900 ? 'text-warning' : 'text-ink-tertiary')}>
                        {basicInfo.bio.length}/1000
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Localização"
                        value={basicInfo.regiao}
                        onChange={(e) => { setBasicInfo((prev) => ({ ...prev, regiao: e.target.value })); }}
                        placeholder="ex: Luanda, Angola"
                      />
                      <Input
                        label="Website"
                        type="url"
                        value={basicInfo.website}
                        onChange={(e) => { setBasicInfo((prev) => ({ ...prev, website: e.target.value })); }}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button type="submit" isLoading={mutation.isPending} className="gap-2">
                        <Save size={13} /> Guardar Informações
                      </Button>
                    </div>
                  </form>
                )}

                {/* ── COMPETÊNCIAS ── */}
                {activeSection === 'competencias' && (
                  <div className="space-y-6">
                    <TagInput
                      label="Competências Técnicas"
                      tags={competencias}
                      onChange={setCompetencias}
                      placeholder="ex: React, Python, Design... (Enter)"
                    />
                    <TagInput
                      label="Áreas de Interesse"
                      tags={areasInteresse}
                      onChange={setAreasInteresse}
                      placeholder="ex: IA, Gestão, Saúde... (Enter)"
                    />
                    <div className="flex justify-end pt-2">
                      <Button
                        type="button"
                        isLoading={mutation.isPending}
                        onClick={() => { save({ competencias, areasInteresse }); }}
                        className="gap-2"
                      >
                        <Save size={13} /> Guardar Competências
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── EXPERIÊNCIA ── */}
                {activeSection === 'experiencia' && (
                  <div className="space-y-3">
                    {experiencias.length === 0 && !showExpForm && (
                      <div className="py-6 text-center">
                        <Briefcase size={28} className="text-ink-tertiary mx-auto mb-2" strokeWidth={1.5} />
                        <p className="text-sm text-ink-secondary font-semibold">Nenhuma experiência adicionada</p>
                        <p className="text-xs text-ink-tertiary mt-1">Adiciona os teus cargos e empresas para completar o perfil.</p>
                      </div>
                    )}
                    {experiencias.map((exp) => (
                      <div key={exp.id} className="flex items-start gap-3 p-4 rounded-xl bg-recessed border border-ink-tertiary/[0.06]">
                        <div className="h-9 w-9 rounded-xl bg-chrome-active/[0.07] flex items-center justify-center shrink-0 mt-0.5">
                          <Briefcase size={14} className="text-chrome-active" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-ink-primary leading-tight">{exp.cargo}</p>
                          <p className="text-xs text-ink-secondary">{exp.empresa}</p>
                          <p className="text-xs text-ink-tertiary mt-0.5">
                            {exp.inicio}{exp.atual ? ' · Atual' : exp.fim ? ` · ${exp.fim}` : ''}
                          </p>
                          {exp.descricao && <p className="text-xs text-ink-tertiary mt-1.5 leading-relaxed line-clamp-2">{exp.descricao}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => { setExperiencias((prev) => prev.filter((e) => e.id !== exp.id)); }}
                          className="h-8 w-8 rounded-lg bg-error/10 text-error flex items-center justify-center hover:bg-error/20 transition-colors shrink-0 mt-0.5"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    {showExpForm && (
                      <ExperienciaForm
                        onSave={(v) => { setExperiencias((prev) => [...prev, v]); setShowExpForm(false); }}
                        onCancel={() => { setShowExpForm(false); }}
                      />
                    )}
                    <div className="flex items-center justify-between pt-1">
                      {!showExpForm && (
                        <button
                          type="button"
                          onClick={() => { setShowExpForm(true); }}
                          className="inline-flex items-center gap-2 text-sm font-bold text-accent hover:underline"
                        >
                          <Plus size={14} /> Adicionar experiência
                        </button>
                      )}
                      <Button
                        type="button"
                        isLoading={mutation.isPending}
                        onClick={() => { save({ historicoProfissional: experiencias }); }}
                        disabled={showExpForm || mutation.isPending}
                        className="gap-2 ml-auto"
                      >
                        <Save size={13} /> Guardar
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── EDUCAÇÃO ── */}
                {activeSection === 'educacao' && (
                  <div className="space-y-3">
                    {educacao.length === 0 && !showEduForm && (
                      <div className="py-6 text-center">
                        <GraduationCap size={28} className="text-ink-tertiary mx-auto mb-2" strokeWidth={1.5} />
                        <p className="text-sm text-ink-secondary font-semibold">Nenhuma formação adicionada</p>
                        <p className="text-xs text-ink-tertiary mt-1">Adiciona os teus graus académicos e formações.</p>
                      </div>
                    )}
                    {educacao.map((edu) => (
                      <div key={edu.id} className="flex items-start gap-3 p-4 rounded-xl bg-recessed border border-ink-tertiary/[0.06]">
                        <div className="h-9 w-9 rounded-xl bg-accent/[0.07] flex items-center justify-center shrink-0 mt-0.5">
                          <GraduationCap size={14} className="text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-ink-primary leading-tight">{edu.grau}</p>
                          <p className="text-xs text-ink-secondary">{edu.instituicao}</p>
                          {edu.area && <p className="text-xs text-ink-tertiary">{edu.area}</p>}
                          <p className="text-xs text-ink-tertiary mt-0.5">
                            {edu.inicio}{edu.atual ? ' · A frequentar' : edu.fim ? ` · ${edu.fim}` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setEducacao((prev) => prev.filter((e) => e.id !== edu.id)); }}
                          className="h-8 w-8 rounded-lg bg-error/10 text-error flex items-center justify-center hover:bg-error/20 transition-colors shrink-0 mt-0.5"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    {showEduForm && (
                      <EducacaoForm
                        onSave={(v) => { setEducacao((prev) => [...prev, v]); setShowEduForm(false); }}
                        onCancel={() => { setShowEduForm(false); }}
                      />
                    )}
                    <div className="flex items-center justify-between pt-1">
                      {!showEduForm && (
                        <button
                          type="button"
                          onClick={() => { setShowEduForm(true); }}
                          className="inline-flex items-center gap-2 text-sm font-bold text-accent hover:underline"
                        >
                          <Plus size={14} /> Adicionar formação
                        </button>
                      )}
                      <Button
                        type="button"
                        isLoading={mutation.isPending}
                        onClick={() => { save({ formacaoAcademica: educacao }); }}
                        disabled={showEduForm || mutation.isPending}
                        className="gap-2 ml-auto"
                      >
                        <Save size={13} /> Guardar
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── REDES SOCIAIS ── */}
                {activeSection === 'social' && (
                  <div className="space-y-4">
                    <SocialLinksEditor links={socialLinks} onChange={setSocialLinks} />
                    <div className="flex justify-end pt-2">
                      <Button
                        type="button"
                        isLoading={mutation.isPending}
                        onClick={() => { save({ socialLinks }); }}
                        className="gap-2"
                      >
                        <Save size={13} /> Guardar Redes Sociais
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
