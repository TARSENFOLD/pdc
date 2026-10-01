import { useCallback, useEffect, useRef, useState } from 'react';
import type { Experiencia } from '@pdc/shared';
import { useTelemetry } from '@/hooks/useTelemetry';

export function ExperienceCurriculum({
  experience,
  preview,
}: {
  experience: Experiencia;
  preview: boolean;
}) {
  const { track } = useTelemetry();
  const [active, setActive] = useState<string | null>(null);
  const started = useRef<number | null>(null);
  const flush = useCallback(() => {
    if (started.current === null || !active) return;
    const dwellTime = Date.now() - started.current;
    started.current = null;
    if (!preview && dwellTime > 1000)
      track('experiencia.timeline_click', {
        experienceId: experience.id,
        discipline: active,
        dwellTime,
      });
  }, [active, experience.id, preview, track]);
  useEffect(() => {
    if (active && document.visibilityState !== 'hidden') started.current = Date.now();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
      else if (active) started.current = Date.now();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      flush();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, [active, flush]);
  return (
    <div className="space-y-4">
      {experience.gradeDestaque?.map((item) => (
        <section key={item.disciplina} className="border-border rounded-lg border p-4">
          <h2>
            <button
              type="button"
              className="focus-visible:outline-accent min-h-11 w-full text-left text-xl font-semibold"
              aria-expanded={active === item.disciplina}
              onClick={() => setActive(active === item.disciplina ? null : item.disciplina)}
            >
              {item.disciplina}
            </button>
          </h2>
          {active === item.disciplina && (
            <div className="space-y-3 pt-3">
              <p>{item.descricao}</p>
              <p>{item.relevanciaMercado}</p>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
