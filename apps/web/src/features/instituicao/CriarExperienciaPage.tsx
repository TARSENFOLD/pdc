import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ExperiencePublishActions } from './components/ExperiencePublishActions';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CriarExperienciaPayloadSchema, type CriarExperienciaPayload } from '@pdc/shared';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { experienciasApi } from '@/lib/api/experiencias';
import { Spinner, Button, Input } from '@/components/ui';
import { toast } from '@/hooks/useToast';
import { RichBuilderShell, BuilderSection, BuilderUploadZone } from '@/components/builders';
import { useAuth } from '@/lib/auth/auth-context';
import { getErrorBody } from '@/lib/api/http';
import { ExperienceSectionsBuilder } from './components/ExperienceSectionsBuilder';
import { ExperienceIdentityFields } from './components/ExperienceIdentityFields';
import { ExperienceCanonicalPanelsEditor } from './components/ExperienceCanonicalPanelsEditor';
import { experienceDefaults, experienceFormValues } from './components/experience-defaults';
import { useExperienceLocalDraft } from './components/useExperienceLocalDraft';

export function CriarExperienciaPage() {
  const { id } = useParams<{ id?: string }>();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const cache = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [referencia, setReferencia] = useState('');
  const initialVwx = params.get('tipo') === 'vwx' && user?.role === 'super_admin';
  const form = useForm<CriarExperienciaPayload>({
    resolver: zodResolver(CriarExperienciaPayloadSchema),
    defaultValues: experienceDefaults(initialVwx),
  });
  const {
    register,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = form;
  const queryKey = ['experiencias', 'editor', id];
  const existing = useQuery({
    queryKey,
    queryFn: () => experienciasApi.getMineById(id ?? ''),
    enabled: !!id,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const vwx = watch('tipoExperiencia') === 'vwx';
  const storageKey = `pdc_experiencia_draft:${user?.id ?? 'guest'}:${initialVwx ? 'vwx' : 'institucional'}`;
  useEffect(() => {
    if (existing.data) reset(experienceFormValues(existing.data));
  }, [existing.data, reset]);
  useExperienceLocalDraft(form, id, initialVwx, storageKey, setMessage);

  async function refresh() {
    await cache.invalidateQueries({ queryKey: ['experiencias'] });
    await cache.invalidateQueries({ queryKey: ['catalogo-experiencias'] });
  }
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage('');
    try {
      await action();
    } catch (err) {
      setMessage(getErrorBody(err)?.error ?? 'Não foi possível guardar. Tenta novamente.');
    } finally {
      setBusy(false);
    }
  }
  function save(submit = false) {
    if (submit && id && !isDirty && existing.data?.estado !== 'rejected') {
      transition('review');
      return;
    }
    void form.handleSubmit(
      (data) =>
        run(async () => {
          const saved = id
            ? await experienciasApi.update(id, data)
            : await experienciasApi.create(data);
          const targetId = String(saved.id);
          reset(data);
          localStorage.removeItem(storageKey);
          if (!id) navigate(`/app/instituicao/editar-experiencia/${targetId}`, { replace: true });
          await refresh();
          if (submit) {
            await experienciasApi.updateEstado(targetId, 'review');
            await refresh();
          }
          toast({ title: submit ? 'Enviado para revisão.' : 'Rascunho guardado.' });
        }),
      () => {
        setMessage('Revê os campos assinalados antes de guardar.');
      }
    )();
  }
  function transition(estado: string) {
    if (!id) return;
    if (isDirty) {
      setMessage('Guarda as alterações antes de mudar o estado. Uma edição requer nova revisão.');
      return;
    }
    void run(async () => {
      await experienciasApi.updateEstado(id, estado);
      await refresh();
    });
  }
  const state = existing.data?.estado ?? 'draft';
  if (id && existing.isLoading)
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  if (id && existing.isError)
    return (
      <div role="alert" className="p-8">
        Não foi possível abrir este conteúdo.{' '}
        <Button
          onClick={() => {
            void existing.refetch();
          }}
        >
          Tentar novamente
        </Button>
      </div>
    );
  return (
    <RichBuilderShell
      title={
        vwx ? (id ? 'Editar VWX' : 'Criar VWX') : id ? 'Editar experiência' : 'Criar experiência'
      }
      backTo="/app/instituicao/experiencias"
      steps={[
        { id: 'identidade', label: 'Dados principais', description: 'Identidade e contexto' },
        {
          id: 'estrutura',
          label: vwx ? 'Percurso profissional' : 'Storytelling',
          description: 'Organiza os conteúdos',
        },
        ...(vwx
          ? [{ id: 'parceiro', label: 'Validação do parceiro', description: 'Registo privado PDC' }]
          : [
              { id: 'realidade', label: 'Realidade', description: 'Contexto da formação' },
              { id: 'vozes', label: 'Vozes', description: 'Depoimentos reais' },
              { id: 'guia', label: 'Instituição', description: 'Campus e percurso' },
            ]),
      ]}
      settingsPanel={
        <ExperiencePublishActions
          vwx={vwx}
          state={state}
          message={message}
          busy={busy}
          canApprove={user?.role === 'super_admin'}
          id={id}
          slug={existing.data?.slug}
          save={save}
          transition={transition}
        />
      }
    >
      <BuilderSection
        value="identidade"
        title="Identidade e contexto"
        description="Apresenta a proposta e o seu público."
      >
        <ExperienceIdentityFields register={register} errors={errors} />
        <div className="mt-6 space-y-3">
          <p className="text-sm font-semibold">Imagem de capa</p>
          {watch('capaUrl') && (
            <img src={watch('capaUrl')} alt="Capa" className="max-h-48 rounded-lg" />
          )}
          <BuilderUploadZone
            accept="image/*"
            onUploadComplete={(urls) => {
              if (urls[0]) setValue('capaUrl', urls[0], { shouldDirty: true });
            }}
          />
        </div>
        {vwx && (
          <div className="mt-6 space-y-4">
            <Input label="Profissão ou função" {...register('vwx.profissao')} />
            <Input label="Entidade parceira" {...register('vwx.entidade')} />
            <Input label="O que o participante irá produzir" {...register('vwx.objetivo')} />
          </div>
        )}
      </BuilderSection>
      <BuilderSection
        value="estrutura"
        title={vwx ? 'Percurso profissional' : 'Secções da experiência'}
        description={
          vwx
            ? 'Contexto, briefing, exploração, prática, entregável, debrief e reflexão.'
            : 'Organiza a apresentação da formação com o conteúdo já disponível.'
        }
      >
        <ExperienceSectionsBuilder
          control={control}
          register={register}
          watch={watch}
          setValue={setValue}
        />
      </BuilderSection>
      {vwx ? (
        <BuilderSection
          value="parceiro"
          title="Validação da entidade"
          description="Regista a autorização recebida da entidade para esta versão. Estes dados são privados."
        >
          {existing.data?.vwxValidacao && (
            <p className="text-success mb-4">
              Validação registada por {existing.data.vwxValidacao.responsavel}.
            </p>
          )}
          <div className="space-y-4">
            <Input
              label="Responsável pela validação"
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
            />
            <Input
              label="Referência da aprovação"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
            />
            <p className="text-ink-secondary text-sm">
              Guarda primeiro o conteúdo. Alterações posteriores requerem nova validação.
            </p>
            <Button
              disabled={!id || isDirty || busy}
              onClick={() => {
                if (id)
                  void run(async () => {
                    await experienciasApi.validarParceiro(id, { responsavel, referencia });
                    await refresh();
                  });
              }}
            >
              Registar validação
            </Button>
          </div>
        </BuilderSection>
      ) : (
        <>
          <BuilderSection
            value="realidade"
            title="Painel de Realidade"
            description="Dados verificados sobre a área."
          >
            <ExperienceCanonicalPanelsEditor
              panel="realidade"
              control={control}
              register={register}
              watch={watch}
              setValue={setValue}
            />
          </BuilderSection>
          <BuilderSection
            value="vozes"
            title="Mural de Vozes"
            description="Depoimentos reais da comunidade."
          >
            <ExperienceCanonicalPanelsEditor
              panel="vozes"
              control={control}
              register={register}
              watch={watch}
              setValue={setValue}
            />
          </BuilderSection>
          <BuilderSection
            value="guia"
            title="Guia Institucional"
            description="Campus, recursos e percurso curricular."
          >
            <ExperienceCanonicalPanelsEditor
              panel="guia"
              control={control}
              register={register}
              watch={watch}
              setValue={setValue}
            />
          </BuilderSection>
        </>
      )}
    </RichBuilderShell>
  );
}
