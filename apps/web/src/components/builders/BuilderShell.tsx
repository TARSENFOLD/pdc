import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Breadcrumb {
  label: string;
  to?: string;
}

interface Section {
  id: string;
  label: string;
}

interface BuilderShellProps {
  title: string;
  description: string;
  actions: React.ReactNode;
  children: React.ReactNode;
  form?: unknown;
  breadcrumbs?: Breadcrumb[];
  sections?: Section[];
  state?: string;
}

export default function BuilderShell({ 
  title, 
  description, 
  children, 
  actions,
  form: _form,
  breadcrumbs,
  state,
  sections
}: BuilderShellProps): React.ReactElement {
  const [activeSection, setActiveSection] = useState(sections?.[0]?.id ?? null);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-32">
      <header className="space-y-6">
        {breadcrumbs && (
          <nav className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-ink-tertiary">
            {breadcrumbs.map((b, i) => (
              <React.Fragment key={i}>
                {b.to ? (
                  <Link to={b.to} className="hover:text-accent transition-colors">{b.label}</Link>
                ) : (
                  <span>{b.label}</span>
                )}
                {i < breadcrumbs.length - 1 && <ChevronRight size={10} />}
              </React.Fragment>
            ))}
          </nav>
        )}
        
        <div className="flex items-end justify-between gap-6">
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-ink-primary">{title}</h1>
            <p className="text-ink-secondary">{description}</p>
          </div>
          {state && (
            <div className="px-3 py-1 bg-accent/10 border border-accent/20 rounded-sm text-[10px] font-semibold text-accent uppercase tracking-wide">
              {state}
            </div>
          )}
        </div>

        {sections && (
          <nav className="flex gap-6 border-b border-white/5 pb-4 sticky top-0 bg-canvas/80 backdrop-blur-sm z-10">
            {sections.map(s => (
              <button 
                key={s.id} 
                onClick={() => { scrollToSection(s.id); }}
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wide transition-colors",
                  activeSection === s.id ? "text-accent border-b border-accent" : "text-ink-tertiary hover:text-accent"
                )}
              >
                {s.label}
              </button>
            ))}
          </nav>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-12">{children}</div>
        <div className="lg:col-span-4">{actions}</div>
      </div>
    </div>
  );
}
