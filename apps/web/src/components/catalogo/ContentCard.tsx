import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Badge, type BadgeVariant } from '../ui/Badge';
import { motion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';

interface ContentCardProps {
  title: string;
  subtitle?: string | undefined;
  image?: string | undefined;
  href: string;
  badges?: Array<{ label: string; variant?: BadgeVariant | undefined }>;
  footerInfo?: Array<{ icon: LucideIcon; label: string }>;
  icon?: LucideIcon;
}

export default function ContentCard({ title, subtitle, image, href, badges, footerInfo, icon: PlaceholderIcon }: ContentCardProps) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 220, damping: 28 }}
      className="h-full"
    >
      <Link to={href} className="block h-full">
        <Card interactive className="overflow-hidden h-full flex flex-col border-white/5 bg-elevated/50">
          <div className="aspect-video bg-recessed relative overflow-hidden">
            {image ? (
              <img
                src={image}
                alt={title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-accent/10 via-recessed to-elevated flex items-center justify-center">
                {PlaceholderIcon ? (
                  <PlaceholderIcon size={40} className="text-accent/20" strokeWidth={1} />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <span className="text-accent/40 font-bold text-xs font-mono">PDC</span>
                  </div>
                )}
              </div>
            )}
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
              <h3 className="font-semibold text-ink-primary line-clamp-2 mb-1">{title}</h3>
              <p className="text-xs text-ink-tertiary">{subtitle || 'PDC'}</p>
            </div>
            {footerInfo && footerInfo.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                {footerInfo.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px] text-ink-tertiary font-medium">
                    <f.icon size={12} />
                    {f.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}
