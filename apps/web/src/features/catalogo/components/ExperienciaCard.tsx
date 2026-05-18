import { Link } from 'react-router-dom';
import { Clock, Star, MapPin, CheckCircle2, Building2 } from 'lucide-react';
import type { ExperienciaPublica } from '@pdc/shared';

const AREA_LABELS: Record<string, string> = {
  SAUDE: 'Saúde',
  ENGENHARIA: 'Engenharia',
  TECNOLOGIA: 'Tecnologia',
  DIREITO: 'Direito',
  GESTAO: 'Gestão',
  EDUCACAO: 'Educação',
  ARTES: 'Artes',
  CIENCIAS_AGRARIAS: 'Ciências Agrárias',
  CIENCIAS_SOCIAIS: 'Ciências Sociais',
  COMUNICACAO: 'Comunicação',
  CIENCIAS_NATURAIS: 'Ciências Naturais',
  ARQUITETURA: 'Arquitetura',
  TURISMO_HOTELARIA: 'Turismo e Hotelaria',
  DESPORTO: 'Desporto',
  OUTRA: 'Outra',
};

const MODALIDADE_LABELS: Record<string, string> = {
  presencial: 'Presencial',
  online: 'Online',
  hibrido: 'Híbrido',
};

interface ExperienciaCardProps {
  experiencia: ExperienciaPublica;
  href: string;
}

export function ExperienciaCard({ experiencia: exp, href }: ExperienciaCardProps) {
  const areaLabel = exp.area ? (AREA_LABELS[exp.area] ?? exp.area) : null;
  const modalidadeLabel = exp.modalidade ? (MODALIDADE_LABELS[exp.modalidade] ?? exp.modalidade) : null;

  return (
    <Link
      to={href}
      className="group block bg-elevated border border-border rounded-sm overflow-hidden hover:border-accent/40 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      aria-label={`Ver experiência: ${exp.titulo}`}
    >
      {/* Thumbnail */}
      <div className="relative h-44 bg-surface overflow-hidden">
        {exp.capaUrl ? (
          <img
            src={exp.capaUrl}
            alt={exp.titulo}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/10 to-surface">
            <MapPin size={32} className="text-accent/40" />
          </div>
        )}

        {/* Badge: Validado Academicamente */}
        {exp.validadoAcademicamente && (
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-success/90 text-white px-2 py-0.5 rounded-sm text-[10px] font-semibold uppercase tracking-wide">
            <CheckCircle2 size={10} />
            Validado
          </div>
        )}

        {/* Badge: Gratuito — Inegociável Spec 04 §3.1 */}
        <div className="absolute top-3 right-3 bg-canvas/90 text-ink-secondary px-2 py-0.5 rounded-sm text-[10px] font-semibold uppercase tracking-wide border border-border">
          Gratuito
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Área badge */}
        {areaLabel && (
          <span className="inline-block text-[10px] font-semibold uppercase tracking-wide text-accent bg-accent/10 px-2 py-0.5 rounded-sm">
            {areaLabel}
          </span>
        )}

        {/* Título */}
        <h3 className="text-sm font-semibold text-ink-primary leading-snug line-clamp-2 group-hover:text-accent transition-colors duration-200">
          {exp.titulo}
        </h3>

        {/* Instituição */}
        {exp.instituicao?.nome && (
          <div className="flex items-center gap-1.5 text-xs text-ink-tertiary">
            <Building2 size={11} />
            <span className="truncate">{exp.instituicao.nome}</span>
          </div>
        )}

        {/* Metadados em linha: rating · duração · modalidade */}
        <div className="flex items-center gap-3 pt-1 border-t border-border text-xs text-ink-tertiary">
          {/* Rating real (null = sem avaliações ainda) */}
          {exp.ratingAvg !== null && exp.ratingAvg !== undefined ? (
            <span className="flex items-center gap-1 text-warning font-medium">
              <Star size={11} fill="currentColor" />
              {exp.ratingAvg.toFixed(1)}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-ink-tertiary/50">
              <Star size={11} />
              —
            </span>
          )}

          {/* Duração real (null = não preenchida pelo criador) */}
          {exp.duracaoEstimada ? (
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {exp.duracaoEstimada}h
            </span>
          ) : null}

          {/* Modalidade */}
          {modalidadeLabel && (
            <span className="ml-auto uppercase tracking-wide text-[10px]">
              {modalidadeLabel}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
