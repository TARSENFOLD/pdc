import { Building2, GraduationCap, MapPin, Quote } from 'lucide-react';
import type { Experiencia } from '@pdc/shared';

function RealityValue({ label, value }: { label: string; value: string | undefined }): React.JSX.Element {
  return (
    <div className="border-l-2 border-accent pl-4">
      <p className="text-xs font-semibold uppercase text-ink-tertiary">{label}</p>
      <p className="mt-2 text-xl font-semibold text-ink-primary">{value || 'Não informado'}</p>
    </div>
  );
}

export function ExperienceStoryPanels({ experience }: { experience: Experiencia }): React.JSX.Element {
  const reality = experience.painelRealidade;
  const employers = reality?.principaisEmpregadores ?? [];
  const voices = experience.muralVozes ?? [];
  const guide = experience.guiaInstitucional;

  return (
    <div className="border-y border-border">
      <section className="grid gap-10 py-12 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div>
          <p className="text-xs font-semibold uppercase text-accent">Painel de realidade</p>
          <h2 className="mt-3 font-display text-2xl text-ink-primary">O mercado sem atalhos</h2>
          <p className="mt-3 text-sm leading-6 text-ink-secondary">Indicadores que ajudam a avaliar esta escolha no contexto angolano.</p>
        </div>
        <div className="space-y-10">
          <div className="grid gap-6 sm:grid-cols-3">
            <RealityValue label="Empregabilidade" value={reality?.taxaEmpregabilidade} />
            <RealityValue label="Salário médio" value={reality?.salarioMedio} />
            <RealityValue label="Conclusão" value={reality?.taxaConclusao} />
          </div>
          {employers.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-ink-primary">Principais empregadores</h3>
              <div className="mt-4 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
                {employers.map((employer, index) => {
                  const content = (
                    <>
                      <div className="flex h-12 w-12 items-center justify-center bg-recessed">
                        {employer.logoUrl
                          ? <img src={employer.logoUrl} alt="" className="h-9 w-9 object-contain" />
                          : <Building2 size={22} className="text-ink-tertiary" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink-primary">{employer.nome}</p>
                        {employer.setor && <p className="mt-1 text-xs text-ink-secondary">{employer.setor}</p>}
                      </div>
                    </>
                  );
                  return employer.url ? (
                    <a key={`${employer.nome}-${String(index)}`} href={employer.url} target="_blank" rel="noreferrer" className="flex items-center gap-4 bg-canvas p-4 hover:bg-recessed">
                      {content}
                    </a>
                  ) : (
                    <div key={`${employer.nome}-${String(index)}`} className="flex items-center gap-4 bg-canvas p-4">
                      {content}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-10 border-t border-border py-12 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div>
          <p className="text-xs font-semibold uppercase text-accent">Mural de vozes</p>
          <h2 className="mt-3 font-display text-2xl text-ink-primary">Quem já viveu conta</h2>
        </div>
        {voices.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {voices.map((voice, index) => (
              <blockquote key={`${voice.autor}-${String(index)}`} className="border-t border-border pt-5">
                <Quote size={20} className="text-accent" />
                <p className="mt-4 text-base leading-7 text-ink-primary">{voice.depoimento}</p>
                <footer className="mt-5 text-sm">
                  <p className="font-semibold text-ink-primary">{voice.autor}</p>
                  <p className="text-ink-secondary">{voice.cargo || voice.tipo}</p>
                </footer>
              </blockquote>
            ))}
          </div>
        ) : <p className="text-sm text-ink-secondary">A instituição ainda não publicou depoimentos.</p>}
      </section>

      <section className="grid gap-10 border-t border-border py-12 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div>
          <p className="text-xs font-semibold uppercase text-accent">Guia institucional</p>
          <h2 className="mt-3 font-display text-2xl text-ink-primary">Onde a formação acontece</h2>
        </div>
        <div className="space-y-8">
          {(guide?.fotosCampus?.length ?? 0) > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {guide?.fotosCampus?.map((url, index) => (
                <img key={url} src={url} alt={`Instalação ${String(index + 1)}`} className="aspect-video w-full object-cover" />
              ))}
            </div>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            {guide?.laboratorios && <p className="flex gap-3 text-sm leading-6 text-ink-secondary"><MapPin className="mt-0.5 shrink-0 text-accent" size={18} />{guide.laboratorios}</p>}
            {guide?.corpoDocente && <p className="flex gap-3 text-sm leading-6 text-ink-secondary"><GraduationCap className="mt-0.5 shrink-0 text-accent" size={18} />{guide.corpoDocente}</p>}
          </div>
          {(guide?.timelineCurricular?.length ?? 0) > 0 && (
            <ol className="border-l border-border">
              {guide?.timelineCurricular?.map((phase, index) => (
                <li key={`${phase.ano}-${String(index)}`} className="relative pb-6 pl-6 last:pb-0">
                  <span className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-accent" />
                  <p className="text-xs font-semibold uppercase text-accent">{phase.ano}</p>
                  <p className="mt-1 text-sm text-ink-primary">{phase.foco}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </div>
  );
}
