import { Building2, GraduationCap, MapPin, Quote } from 'lucide-react';
import type { Experiencia } from '@pdc/shared';

function RealityValue({
  label,
  value,
}: {
  label: string;
  value: string | undefined;
}): React.JSX.Element {
  return (
    <div className="border-accent border-l-2 pl-4">
      <p className="text-ink-tertiary text-xs font-semibold uppercase">{label}</p>
      <p className="text-ink-primary mt-2 text-xl font-semibold">{value || 'Não informado'}</p>
    </div>
  );
}

export function ExperienceStoryPanels({
  experience,
}: {
  experience: Experiencia;
}): React.JSX.Element {
  const reality = experience.painelRealidade;
  const employers = reality?.principaisEmpregadores ?? [];
  const voices = experience.muralVozes ?? [];
  const guide = experience.guiaInstitucional;
  const hasReality =
    reality?.taxaEmpregabilidade ||
    reality?.salarioMedio ||
    reality?.taxaConclusao ||
    employers.length;
  const hasGuide =
    guide?.fotosCampus?.length ||
    guide?.biblioteca ||
    guide?.laboratorios ||
    guide?.corpoDocente ||
    guide?.timelineCurricular?.length;
  if (!hasReality && !voices.length && !hasGuide) return <></>;

  return (
    <div className="border-border border-y">
      {!!hasReality && (
        <section className="grid gap-10 py-12 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div>
            <p className="text-accent text-xs font-semibold uppercase">Painel de realidade</p>
            <h2 className="font-display text-ink-primary mt-3 text-2xl">O mercado sem atalhos</h2>
            <p className="text-ink-secondary mt-3 text-sm leading-6">
              Indicadores que ajudam a avaliar esta escolha no contexto angolano.
            </p>
          </div>
          <div className="space-y-10">
            <div className="grid gap-6 sm:grid-cols-3">
              <RealityValue label="Empregabilidade" value={reality?.taxaEmpregabilidade} />
              <RealityValue label="Salário médio" value={reality?.salarioMedio} />
              <RealityValue label="Conclusão" value={reality?.taxaConclusao} />
            </div>
            {employers.length > 0 && (
              <div>
                <h3 className="text-ink-primary text-sm font-semibold">Principais empregadores</h3>
                <div className="border-border bg-border mt-4 grid gap-px border sm:grid-cols-2 lg:grid-cols-3">
                  {employers.map((employer, index) => {
                    const content = (
                      <>
                        <div className="bg-recessed flex h-12 w-12 items-center justify-center">
                          {employer.logoUrl ? (
                            <img
                              src={employer.logoUrl}
                              alt={employer.nome}
                              className="h-9 w-9 object-contain"
                            />
                          ) : (
                            <Building2 size={22} className="text-ink-tertiary" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-ink-primary truncate font-semibold">{employer.nome}</p>
                          {employer.setor && (
                            <p className="text-ink-secondary mt-1 text-xs">{employer.setor}</p>
                          )}
                        </div>
                      </>
                    );
                    return employer.url ? (
                      <a
                        key={index}
                        href={employer.url}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-canvas hover:bg-recessed flex items-center gap-4 p-4"
                      >
                        {content}
                      </a>
                    ) : (
                      <div key={index} className="bg-canvas flex items-center gap-4 p-4">
                        {content}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {voices.length > 0 && (
        <section className="border-border grid gap-10 border-t py-12 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div>
            <p className="text-accent text-xs font-semibold uppercase">Mural de vozes</p>
            <h2 className="font-display text-ink-primary mt-3 text-2xl">Quem já viveu conta</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {voices.map((voice, index) => (
              <blockquote
                key={`${voice.autor}-${String(index)}`}
                className="border-border border-t pt-5"
              >
                <Quote size={20} className="text-accent" />
                <p className="text-ink-primary mt-4 text-base leading-7">{voice.depoimento}</p>
                <footer className="mt-5 text-sm">
                  <p className="text-ink-primary font-semibold">{voice.autor}</p>
                  <p className="text-ink-secondary">{voice.cargo || voice.tipo}</p>
                </footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {!!hasGuide && (
        <section className="border-border grid gap-10 border-t py-12 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div>
            <p className="text-accent text-xs font-semibold uppercase">Guia institucional</p>
            <h2 className="font-display text-ink-primary mt-3 text-2xl">
              Onde a formação acontece
            </h2>
          </div>
          <div className="space-y-8">
            {(guide?.fotosCampus?.length ?? 0) > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {guide?.fotosCampus?.map((url, index) => (
                  <img
                    key={url}
                    src={url}
                    alt={`Instalação ${String(index + 1)}`}
                    className="aspect-video w-full object-cover"
                  />
                ))}
              </div>
            )}
            <div className="grid gap-5 sm:grid-cols-2">
              {guide?.biblioteca && (
                <p className="text-ink-secondary text-sm leading-6">
                  Biblioteca: {guide.biblioteca}
                </p>
              )}
              {guide?.laboratorios && (
                <p className="text-ink-secondary flex gap-3 text-sm leading-6">
                  <MapPin className="text-accent mt-0.5 shrink-0" size={18} />
                  {guide.laboratorios}
                </p>
              )}
              {guide?.corpoDocente && (
                <p className="text-ink-secondary flex gap-3 text-sm leading-6">
                  <GraduationCap className="text-accent mt-0.5 shrink-0" size={18} />
                  {guide.corpoDocente}
                </p>
              )}
            </div>
            {(guide?.timelineCurricular?.length ?? 0) > 0 && (
              <ol className="border-border border-l">
                {guide?.timelineCurricular?.map((phase, index) => (
                  <li
                    key={`${phase.ano}-${String(index)}`}
                    className="relative pb-6 pl-6 last:pb-0"
                  >
                    <span className="bg-accent absolute top-1 -left-1.5 h-3 w-3 rounded-full" />
                    <p className="text-accent text-xs font-semibold uppercase">{phase.ano}</p>
                    <p className="text-ink-primary mt-1 text-sm">{phase.foco}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
