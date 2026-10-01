import { useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { experienciasApi } from '@/lib/api/experiencias';
import { useAuth } from '@/lib/auth/auth-context';
import { useTelemetry } from '@/hooks/useTelemetry';
import { SEOHead } from '@/components/layout/SEOHead';
import { Spinner, Button } from '@/components/ui';
import { getErrorBody } from '@/lib/api/http';
import { ExperienceStoryPanels } from './ExperienceStoryPanels';
import { ExperienceContent } from './ExperienceContent';
import { VwxParticipation } from './VwxParticipation';
import { ExperienceInteractions } from './ExperienceInteractions';
import { ExperienceCurriculum } from './ExperienceCurriculum';

export function ExperienciaDetailPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const preview = params.get('preview') === '1';
  const { isAuthenticated } = useAuth();
  const { track } = useTelemetry();
  const cache = useQueryClient();
  const content = useQuery({
    queryKey: ['experiencias', preview ? 'preview' : 'public', id],
    queryFn: () => (preview ? experienciasApi.getMineById(id) : experienciasApi.getById(id)),
    enabled: !!id,
  });
  const participation = useQuery({
    queryKey: ['experiencias', 'participacao', id],
    queryFn: () => experienciasApi.participacao(id),
    enabled: isAuthenticated && !preview && !!content.data,
  });
  const join = useMutation({
    mutationFn: () => experienciasApi.inscrever(id),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ['experiencias', 'participacao'] });
    },
  });
  const exp = participation.data?.experiencia ?? content.data;
  const experienceId = exp?.id;
  const experienceTitle = exp?.titulo;
  useEffect(() => {
    if (experienceId && !preview)
      track('experiencia.visualizada', { experienceId, titulo: experienceTitle });
  }, [experienceId, experienceTitle, preview, track]);
  if (content.isLoading)
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  if (!exp)
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-8">
        <h1 className="text-2xl font-bold">Conteúdo indisponível</h1>
        <p role="alert">
          {content.isError
            ? (getErrorBody(content.error)?.error ??
              'Não foi possível carregar o conteúdo. Tenta novamente.')
            : 'Não foi possível abrir esta experiência.'}
        </p>
        <Button
          onClick={() => {
            void content.refetch();
          }}
        >
          Tentar novamente
        </Button>
        <Link to="/experiencias">Voltar ao catálogo</Link>
      </main>
    );
  const vwx = exp.tipoExperiencia === 'vwx';
  const member = participation.data?.participacao;
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-5 py-8 pb-20">
      <SEOHead title={`${exp.titulo} | PDC`} description={exp.descricao} />
      <Link to="/experiencias" className="text-accent inline-flex min-h-11 items-center">
        Voltar ao catálogo
      </Link>
      {preview && (
        <p role="status" className="border-border rounded-lg border p-4">
          Pré-visualização privada · {exp.estado}
        </p>
      )}
      <header className="border-border bg-elevated overflow-hidden rounded-xl border">
        {exp.capaUrl && <img src={exp.capaUrl} alt="" className="max-h-96 w-full object-cover" />}
        <div className="space-y-4 p-6 md:p-10">
          <p className="text-accent text-xs font-semibold tracking-wide uppercase">
            {vwx ? 'VWX · Digital Work Experience' : 'Experiência · Explorar formação'}
          </p>
          <h1 className="text-3xl font-bold md:text-5xl">{exp.titulo}</h1>
          <p className="text-ink-secondary max-w-3xl leading-7 whitespace-pre-wrap">
            {exp.descricao}
          </p>
          <p className="text-ink-secondary text-sm">
            {exp.instituicao?.nome ?? exp.vwx?.entidade}
            {exp.duracaoEstimada ? ` · ${exp.duracaoEstimada}h` : ''} · Gratuito
          </p>
          {vwx && exp.vwx && (
            <p className="text-sm">
              <strong>{exp.vwx.profissao}</strong> · {exp.vwx.objetivo}
            </p>
          )}
          {!preview && (
            <div className="flex flex-wrap items-center gap-3">
              {!isAuthenticated ? (
                <Button asChild>
                  <Link to={`/login?redirect=${encodeURIComponent(`/app/experiencias/${exp.id}`)}`}>
                    {vwx ? 'Entrar para iniciar VWX' : 'Entrar para participar'}
                  </Link>
                </Button>
              ) : (
                <Button
                  disabled={join.isPending || participation.isLoading || !!member}
                  onClick={() => join.mutate()}
                >
                  {member
                    ? vwx
                      ? 'VWX iniciada'
                      : 'Já estás a participar'
                    : vwx
                      ? 'Iniciar VWX'
                      : 'Participar'}
                </Button>
              )}
              {isAuthenticated && <ExperienceInteractions id={exp.id} />}
            </div>
          )}
          {join.isError && (
            <p role="alert" className="text-accent-danger">
              {getErrorBody(join.error)?.error ?? 'Não foi possível iniciar a participação.'}
            </p>
          )}
          {participation.isError && (
            <p role="alert">
              Não foi possível consultar a tua participação.{' '}
              <Button
                variant="ghost"
                onClick={() => {
                  void participation.refetch();
                }}
              >
                Tentar novamente
              </Button>
            </p>
          )}
        </div>
      </header>
      {!vwx && <ExperienceStoryPanels experience={exp} />}
      <ExperienceContent sections={exp.secoes ?? []} />
      {!exp.secoes?.length && <ExperienceCurriculum experience={exp} preview={preview} />}
      {vwx && member && !preview && (
        <VwxParticipation key={member.id} experience={exp} participation={member} />
      )}
    </main>
  );
}
