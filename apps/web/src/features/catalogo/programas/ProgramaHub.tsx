import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Boxes,
  Building2,
  CheckCircle,
  Clock,
  FlaskConical,
  FolderKanban,
  LogIn,
  MapPin,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import type { Programa } from '@pdc/shared';
import { Badge, Button, Card } from '@/components/ui';

interface ProgramaHubProps {
  programa: Programa;
  isEnrolled: boolean;
  isAuthenticated: boolean;
  isEnrolling: boolean;
  reducedMotion: boolean | null;
  onEnroll: () => void;
  onLogin: () => void;
}

export default function ProgramaHub({
  programa,
  isEnrolled,
  isAuthenticated,
  isEnrolling,
  reducedMotion,
  onEnroll,
  onLogin,
}: ProgramaHubProps): React.JSX.Element {
  const groups = [
    { label: 'Cursos', icon: BookOpen, items: programa.cursos ?? [] },
    { label: 'Experiências', icon: MapPin, items: programa.experiencias ?? [] },
    { label: 'Simulações', icon: FlaskConical, items: programa.simulacoes ?? [] },
    { label: 'Projetos', icon: FolderKanban, items: programa.projetos ?? [] },
  ];
  const hasContent = groups.some((group) => group.items.length > 0);

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
      <div className="space-y-8 lg:col-span-8">
        <TextCard title="Sobre o Programa" text={programa.proposito} />
        {programa.metodologia && <TextCard title="Metodologia" text={programa.metodologia} />}

        {hasContent && (
          <Card className="rounded-lg border-border bg-elevated p-8">
            <h2 className="mb-6 text-[10px] font-black uppercase tracking-widest text-accent">O Que Está Incluído</h2>
            <div className="space-y-6">
              {groups.map((group) => (
                group.items.length > 0 && (
                  <ContentGroup key={group.label} label={group.label} icon={group.icon} items={group.items} />
                )
              ))}
            </div>
          </Card>
        )}

        {programa.recursos && (
          <Card className="rounded-lg border-border bg-elevated p-8">
            <h2 className="mb-5 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent">
              <Boxes size={14} /> Recursos do programa
            </h2>
            <div className="grid gap-6 sm:grid-cols-3">
              <ResourceList label="Materiais" items={programa.recursos.materiais} />
              <ResourceList label="Infraestrutura" items={programa.recursos.infraestrutura} />
              <ResourceList label="Equipa" items={programa.recursos.equipa} />
            </div>
          </Card>
        )}
      </div>

      <aside className="lg:col-span-4">
        <Card className="sticky top-8 space-y-6 rounded-lg border-border bg-recessed p-8 shadow-[var(--elevation-1)]">
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-ink-tertiary">Detalhes</p>
            {programa.modalidade && <Detail icon={Building2} label="Modalidade" value={programa.modalidade} />}
            {programa.vagas != null && <Detail icon={Users} label="Vagas" value={String(programa.vagas)} />}
            {programa.duracao && <Detail icon={Clock} label="Duração" value={programa.duracao} />}
            {programa.dataInicio && (
              <Detail
                icon={Clock}
                label="Início"
                value={new Date(programa.dataInicio).toLocaleDateString('pt-AO', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              />
            )}
            {programa.precoPolicy && <PricePolicy programa={programa} />}
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            {isEnrolled ? (
              <motion.div
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-3 rounded-lg border border-success/20 bg-success/10 p-4">
                  <CheckCircle size={20} className="shrink-0 text-success" />
                  <div>
                    <p className="text-sm font-black text-ink-primary">Inscrito</p>
                    <p className="text-[10px] text-ink-tertiary">Acompanha o teu progresso nos teus programas.</p>
                  </div>
                </div>
                <Link to="/app/meus-programas">
                  <Button variant="outline" className="h-12 w-full rounded-lg text-[10px] font-black uppercase tracking-widest">
                    Ver Os Meus Programas
                  </Button>
                </Link>
              </motion.div>
            ) : (
              <Button
                onClick={isAuthenticated ? onEnroll : onLogin}
                isLoading={isEnrolling}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-accent text-xs font-black uppercase tracking-widest text-ink-on-accent"
              >
                {!isAuthenticated && <LogIn size={16} />}
                {isAuthenticated ? 'Inscrever-me' : 'Entrar para se Inscrever'}
              </Button>
            )}
          </div>

          {programa.requisitos && (
            <div className="border-t border-border pt-4">
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-ink-tertiary">Requisitos</p>
              <p className="text-xs leading-relaxed text-ink-secondary">{programa.requisitos}</p>
            </div>
          )}
        </Card>
      </aside>
    </div>
  );
}

function TextCard({ title, text }: { title: string; text: string }): React.JSX.Element {
  return (
    <Card className="rounded-lg border-border bg-elevated p-8">
      <h2 className="mb-4 text-[10px] font-black uppercase tracking-widest text-accent">{title}</h2>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-secondary">{text}</p>
    </Card>
  );
}

function ContentGroup({
  label,
  icon: Icon,
  items,
}: {
  label: string;
  icon: LucideIcon;
  items: Array<{ id: string; titulo: string; nivel?: string }>;
}): React.JSX.Element {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Icon size={14} className="text-accent" />
        <span className="text-[10px] font-black uppercase tracking-widest text-ink-tertiary">{label} ({items.length})</span>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 rounded-lg border border-border bg-recessed/50 p-3">
            <Icon size={14} className="shrink-0 text-accent" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-secondary">{item.titulo}</span>
            {item.nivel && <Badge variant="outline" className="text-[9px] uppercase">{item.nivel}</Badge>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Detail({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }): React.JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-elevated">
        <Icon size={16} className="text-accent" />
      </div>
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-ink-tertiary">{label}</p>
        <p className="text-sm font-bold capitalize text-ink-primary">{value}</p>
      </div>
    </div>
  );
}

function PricePolicy({ programa }: { programa: Programa }): React.JSX.Element {
  const policy = programa.precoPolicy;
  if (!policy) return <></>;
  return (
    <div className="border-t border-border pt-4">
      <p className="text-[9px] font-black uppercase tracking-widest text-ink-tertiary">Acesso</p>
      <p className="mt-1 text-sm font-bold text-ink-primary">
        {policy.modo === 'gratuito' ? 'Gratuito' : `${policy.valor.toLocaleString('pt-AO')} ${policy.moeda}`}
      </p>
      {policy.bolsasDisponiveis && <p className="mt-1 text-xs text-ink-secondary">Bolsas disponíveis</p>}
    </div>
  );
}

function ResourceList({ label, items }: { label: string; items: string[] }): React.JSX.Element {
  return (
    <div>
      <h3 className="text-xs font-semibold text-ink-primary">{label}</h3>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-1 text-sm text-ink-secondary">
          {items.map((item, index) => <li key={`${item}-${String(index)}`}>• {item}</li>)}
        </ul>
      ) : <p className="mt-2 text-xs text-ink-tertiary">Não especificado</p>}
    </div>
  );
}
