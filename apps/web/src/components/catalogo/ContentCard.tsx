import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Badge, type BadgeVariant } from '../ui/Badge';
import { LucideIcon } from 'lucide-react';

interface ContentCardProps {
  title: string;
  subtitle?: string | undefined;
  image?: string | undefined;
  href: string;
  badges?: Array<{ label: string; variant?: BadgeVariant | undefined }>;
  footerInfo?: Array<{ icon: LucideIcon; label: string }>;
}

export default function ContentCard({ title, subtitle, image, href, badges, footerInfo }: ContentCardProps) {
  return (
    <Link to={href}>
      <Card interactive className="overflow-hidden h-full flex flex-col border-white/5 bg-elevated/50">
        <div className="aspect-video bg-recessed relative overflow-hidden">
          {image ? (
            <img src={image} alt={title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-ink-tertiary/20 font-bold">PDC</div>
          )}
          <div className="absolute top-3 left-3 flex gap-2">
            {badges?.map((b) => (
              <Badge key={b.variant === undefined ? b.label : `${b.label}-${b.variant}`} variant={b.variant}>
                {b.label || ''}
              </Badge>
            ))}
          </div>
        </div>
        <div className="p-5 flex-1 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-ink-primary line-clamp-2 mb-1">{title}</h3>
            <p className="text-xs text-ink-tertiary">{subtitle || 'PDC Partner'}</p>
          </div>
          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
            {footerInfo?.map((f, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px] text-ink-tertiary font-medium">
                <f.icon size={12} />
                {f.label}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </Link>
  );
}
