import { Link } from 'react-router-dom';
import { GlassCard } from '../ui/GlassCard';
import { Badge, type BadgeVariant } from '../ui/Badge';
import { motion, useReducedMotion } from 'motion/react';
import type React from 'react';
import type { LucideIcon } from 'lucide-react';
import type { CatalogoLinkType } from './catalogoLinks';

interface ContentCardProps {
  title: string;
  subtitle?: string | undefined;
  image?: string | undefined;
  href: string;
  type?: CatalogoLinkType | undefined;
  ctaLabel?: string;
  badges?: Array<{ label: string; variant?: BadgeVariant | undefined }>;
  footerInfo?: Array<{ icon: LucideIcon; label: string }>;
  icon?: LucideIcon;
}

const PLACEHOLDERS: Partial<Record<CatalogoLinkType, string>> = {
  curso: '/images/placeholder/course-default.svg',
  programa: '/images/placeholder/program-default.svg',
  instituicao: '/images/placeholder/logo-default.svg',
};

const TYPE_LABELS: Partial<Record<CatalogoLinkType, string>> = {
  curso: 'Curso',
  simulacao: 'Simulação',
  experiencia: 'Experiência',
  mentor: 'Mentor',
  instituicao: 'Instituição',
  programa: 'Programa',
};

export default function ContentCard({
  title,
  subtitle,
  image,
  href,
  type,
  ctaLabel = 'Ver detalhes',
  badges,
  footerInfo,
  icon: PlaceholderIcon,
}: ContentCardProps): React.JSX.Element {
  const reducedMotion = useReducedMotion();
  const placeholder = type ? PLACEHOLDERS[type] : undefined;
  const typeLabel = type ? TYPE_LABELS[type] : undefined;

  return (
    <motion.div
      {...(!reducedMotion ? { whileHover: { y: -3 } } : {})}
      transition={{ type: 'spring', stiffness: 220, damping: 28 }}
      className="h-full"
    >
      <Link to={href} className="group block h-full" aria-label={`${ctaLabel}: ${title}`}>
        <GlassCard
          halo={false}
          className="flex h-full flex-col overflow-hidden rounded-sm border border-[var(--chrome-border)] bg-[var(--surface-elevated)] p-0 shadow-[var(--elevation-1)] transition-[border-color,box-shadow] hover:border-[var(--accent-terracotta)] hover:shadow-[var(--elevation-2)]"
        >
          <div className="aspect-video bg-recessed relative overflow-hidden">
            {image ? (
              <img
                src={image}
                alt={title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : placeholder ? (
              <img
                src={placeholder}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
                aria-hidden={true}
              />
            ) : (
              <div className="w-full h-full bg-[var(--chrome-active-soft)] flex items-center justify-center">
                {PlaceholderIcon ? (
                  <PlaceholderIcon size={40} className="text-[var(--chrome-active)] opacity-30" strokeWidth={1} />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-[var(--chrome-active-soft)]">
                    <span className="text-[var(--chrome-active)] opacity-40 font-bold text-xs font-mono">PDC</span>
                  </div>
                )}
              </div>
            )}
            {typeLabel ? (
              <span className="absolute bottom-3 left-3 rounded-full border border-[var(--chrome-border)] bg-[var(--surface-overlay)] px-2.5 py-1 text-[10px] font-semibold text-[var(--chrome-active)]">
                {typeLabel}
              </span>
            ) : null}
            {badges && badges.length > 0 && (
              <div className="absolute top-3 left-3 flex gap-2">
                {badges.map((b) => (
                  <Badge key={`${b.label}-${b.variant ?? ''}`} variant={b.variant}>
                    {b.label}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="p-5 flex-1 flex flex-col justify-between">
            <div>
              <h3 className="font-semibold text-ink-primary line-clamp-2 mb-1 group-hover:text-[var(--chrome-active)]">{title}</h3>
              <p className="text-xs text-ink-tertiary line-clamp-2">{subtitle || 'PDC'}</p>
            </div>
            {footerInfo && footerInfo.length > 0 && (
              <div className="mt-4 flex items-center justify-between border-t border-[var(--chrome-border)] pt-4">
                {footerInfo.map((f) => (
                  <div key={f.label} className="flex items-center gap-1.5 text-[10px] text-ink-tertiary font-medium">
                    <f.icon size={12} />
                    {f.label}
                  </div>
                ))}
              </div>
            )}
            <span className="mt-4 text-xs font-semibold text-[var(--chrome-active)]">
              {ctaLabel}
            </span>
          </div>
        </GlassCard>
      </Link>
    </motion.div>
  );
}
