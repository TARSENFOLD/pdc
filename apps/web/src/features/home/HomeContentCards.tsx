import { Link } from 'react-router-dom';
import { BookOpen, FlaskConical, ChevronRight } from 'lucide-react';
import type { InscricaoActivity, TentativaActivity, TrendingItem } from '@pdc/shared';

const TIPO_LABELS: Record<string, string> = {
  curso: 'CURSO',
  simulacao: 'SIMULAÇÃO',
  experiencia: 'EXPERIÊNCIA',
  programa: 'PROGRAMA',
  projeto: 'PROJETO',
  post: 'COMUNIDADE',
};

function resolveTrendingHref(item: TrendingItem): string {
  if (item.tipo === 'curso')       return `/app/cursos/${item.id}`;
  if (item.tipo === 'simulacao')   return `/app/simulacoes/${item.id}`;
  if (item.tipo === 'experiencia') return `/app/experiencias/${item.id}`;
  if (item.tipo === 'programa')    return `/app/programas/${item.id}`;
  if (item.tipo === 'projeto')     return `/app/projetos/${item.id}`;
  return '/app/feed';
}

export function SectionHeader({
  title, viewAllTo,
}: { title: string; viewAllTo?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-base font-bold text-ink-primary">{title}</h2>
      {viewAllTo && (
        <Link
          to={viewAllTo}
          className="flex items-center gap-0.5 text-xs font-semibold text-accent hover:underline"
        >
          Ver tudo <ChevronRight size={13} strokeWidth={2.5} />
        </Link>
      )}
    </div>
  );
}

function ContentTypePill({ tipo }: { tipo: string }) {
  return (
    <span className="text-[9px] font-black uppercase tracking-wider text-ink-tertiary">
      {TIPO_LABELS[tipo] ?? tipo.toUpperCase()}
    </span>
  );
}

export function TrendingCard({ item }: { item: TrendingItem }) {
  return (
    <Link to={resolveTrendingHref(item)} className="block group">
      <div className="rounded-lg overflow-hidden bg-elevated border border-border transition-colors hover:bg-elevated/80">
        <div className="aspect-[16/9] bg-canvas overflow-hidden">
          {item.capaUrl ? (
            <img
              src={item.capaUrl}
              alt={item.titulo}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-elevated">
              <BookOpen size={24} className="text-ink-tertiary" strokeWidth={1.5} />
            </div>
          )}
        </div>
        <div className="p-3 space-y-1">
          <ContentTypePill tipo={item.tipo} />
          <h3 className="text-sm font-semibold text-ink-primary leading-snug line-clamp-2">
            {item.titulo}
          </h3>
        </div>
      </div>
    </Link>
  );
}

export function CourseActivityRow({ item }: { item: InscricaoActivity }) {
  const pct = Math.round(item.progressoPercentual);
  return (
    <Link to={`/app/cursos/${item.cursoId}`} className="block group">
      <div className="flex gap-4 rounded-lg border border-border bg-elevated p-4 transition-colors hover:bg-elevated/80">
        <div className="h-20 w-28 shrink-0 overflow-hidden rounded-md bg-canvas">
          {item.cursoCapaUrl ? (
            <img
              src={item.cursoCapaUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <BookOpen size={20} className="text-ink-tertiary" strokeWidth={1.5} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary mb-1">Curso</p>
            <p className="text-sm font-semibold text-ink-primary leading-snug line-clamp-2">{item.cursoTitulo}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-1.5 rounded-full bg-canvas overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${String(item.progressoPercentual)}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-ink-tertiary tabular-nums shrink-0">{pct}%</span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-md bg-accent px-3 py-1 text-xs font-bold text-white">
              {pct > 0 ? 'Continuar' : 'Começar'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function SimActivityRow({ item }: { item: TentativaActivity }) {
  const statusLabel: Record<string, string> = {
    em_progresso: 'Em progresso',
    concluida: 'Concluída',
    falhou: 'Falhou',
  };
  const isActive = item.status === 'em_progresso';
  return (
    <Link to={`/app/simulacoes/${item.simulacaoId}`} className="block group">
      <div className="flex gap-4 rounded-lg border border-border bg-elevated p-4 transition-colors hover:bg-elevated/80">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md bg-canvas">
          <FlaskConical size={26} className="text-accent" strokeWidth={1.4} />
        </div>
        <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary mb-1">Simulação</p>
            <p className="text-sm font-semibold text-ink-primary leading-snug line-clamp-2">{item.simulacaoTitulo}</p>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-secondary">
              {statusLabel[item.status] ?? item.status} · {Math.round(item.score)} pts
            </span>
            <span className={`inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs font-bold text-white ${
              isActive ? 'bg-accent' : 'bg-elevated border border-border text-ink-secondary'
            }`}>
              {isActive ? 'Retomar' : 'Ver resultado'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
