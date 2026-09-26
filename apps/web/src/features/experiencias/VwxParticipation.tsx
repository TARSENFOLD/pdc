import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Experiencia, ParticipacaoExperiencia } from '@pdc/shared';
import { experienciasApi } from '@/lib/api/experiencias';
import { getErrorBody } from '@/lib/api/http';
import { Button } from '@/components/ui';

export function VwxParticipation({
  experience,
  participation,
}: {
  experience: Experiencia;
  participation: ParticipacaoExperiencia;
}) {
  const cache = useQueryClient();
  const [selectedSections, setSections] = useState(participation.secoesConcluidas);
  const currentIds = new Set(experience.secoes?.map((section) => section.id));
  const sections = selectedSections.filter((id) => currentIds.has(id));
  const [entrega, setEntrega] = useState(participation.entrega);
  const [reflexao, setReflexao] = useState(participation.reflexao);
  const save = useMutation({
    mutationFn: (concluir: boolean) =>
      experienciasApi.progresso(experience.id, {
        secoesConcluidas: sections,
        entrega,
        reflexao,
        concluir,
      }),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ['experiencias', 'participacao'] });
    },
  });
  const done = !!(save.data?.concluidoEm ?? participation.concluidoEm);
  return (
    <section
      aria-label="A minha participação VWX"
      className="border-border bg-elevated space-y-5 rounded-xl border p-6"
    >
      <h2 className="text-xl font-semibold">{done ? 'VWX concluída' : 'O teu percurso'}</h2>
      <p className="text-ink-secondary text-sm">
        {done
          ? 'Percurso concluído. O teu entregável e reflexão estão guardados.'
          : `${sections.length} ${sections.length === 1 ? 'etapa assinalada' : 'etapas assinaladas'}. Guarda para retomar mais tarde.`}
      </p>
      <fieldset disabled={done || save.isPending} className="space-y-3">
        <legend className="sr-only">Etapas realizadas</legend>
        {experience.secoes?.map((section) => (
          <label key={section.id} className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              checked={sections.includes(section.id)}
              onChange={(e) =>
                setSections((previous) =>
                  e.target.checked
                    ? [...previous, section.id]
                    : previous.filter((id) => id !== section.id)
                )
              }
            />
            {section.titulo}
          </label>
        ))}
        <label className="block space-y-2">
          <span>O teu entregável</span>
          <textarea
            value={entrega}
            onChange={(e) => setEntrega(e.target.value)}
            className="border-border bg-canvas min-h-36 w-full rounded-lg border p-3"
            placeholder="Escreve o resultado ou partilha o link para o teu trabalho."
          />
        </label>
        <label className="block space-y-2">
          <span>Reflexão final</span>
          <textarea
            value={reflexao}
            onChange={(e) => setReflexao(e.target.value)}
            className="border-border bg-canvas min-h-28 w-full rounded-lg border p-3"
            placeholder="O que aprendeste e como esta prática influencia o teu próximo passo?"
          />
        </label>
      </fieldset>
      {save.isError && (
        <p role="alert" className="text-accent-danger">
          {getErrorBody(save.error)?.error ?? 'Não foi possível guardar o progresso.'}
        </p>
      )}
      {save.isSuccess && (
        <p role="status" className="text-success">
          {done ? 'Entregável e reflexão guardados. Percurso concluído.' : 'Progresso guardado.'}
        </p>
      )}
      {!done && (
        <div className="flex flex-wrap gap-3">
          <Button disabled={save.isPending} onClick={() => save.mutate(false)}>
            Guardar progresso
          </Button>
          <Button variant="outline" disabled={save.isPending} onClick={() => save.mutate(true)}>
            Concluir VWX
          </Button>
        </div>
      )}
      <p className="text-ink-tertiary text-xs">
        Esta prática não equivale a emprego ou estágio profissional.
      </p>
    </section>
  );
}
