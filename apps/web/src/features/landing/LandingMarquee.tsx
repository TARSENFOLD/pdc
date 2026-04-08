const ITEMS = [
  'Simulações Práticas',
  'Experiências Institucionais',
  'Mentoria Real',
  'Perfil Vocacional',
  'Decisões Informadas',
  'Cursos com Certificado',
  'AI Tutor',
  'Vínculos Profissionais',
];

export function LandingMarquee() {
  // Duplicate items so the seamless loop works
  const doubled = [...ITEMS, ...ITEMS];

  return (
    <div className="overflow-hidden border-y border-amber/20 bg-amber/5 py-3.5">
      <div
        className="flex gap-10 whitespace-nowrap"
        style={{
          animation: 'marquee-scroll 28s linear infinite',
          width: 'max-content',
        }}
      >
        {doubled.map((item, i) => (
          <span key={i} className="flex items-center gap-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
              {item}
            </span>
            <span className="text-amber" aria-hidden>·</span>
          </span>
        ))}
      </div>

      <style>{`
        @keyframes marquee-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .overflow-hidden > div { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
