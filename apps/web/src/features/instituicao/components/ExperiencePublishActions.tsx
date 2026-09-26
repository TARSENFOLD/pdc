import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';

type Props = {
  vwx: boolean;
  state: string;
  message: string;
  busy: boolean;
  canApprove: boolean;
  id: string | undefined;
  slug: string | undefined;
  save: (submit?: boolean) => void;
  transition: (state: string) => void;
};
export function ExperiencePublishActions({
  vwx,
  state,
  message,
  busy,
  canApprove,
  id,
  slug,
  save,
  transition,
}: Props) {
  return (
    <div className="space-y-4">
      <p className="text-ink-secondary text-sm">
        {vwx
          ? 'Prática profissional gratuita, produzida pelo PDC com a entidade parceira.'
          : 'Experiência institucional gratuita para apoiar a escolha de formação.'}
      </p>
      <p className="text-sm">Estado: {state}</p>
      {message && (
        <p role="alert" className="text-accent-danger text-sm">
          {message}
        </p>
      )}
      <Button className="min-h-11 w-full" disabled={busy} onClick={() => save()}>
        {busy ? 'A guardar...' : 'Guardar rascunho'}
      </Button>
      {(state === 'draft' || state === 'rejected') && (
        <Button
          variant="outline"
          disabled={busy}
          className="min-h-11 w-full"
          onClick={() => save(true)}
        >
          Submeter para revisão
        </Button>
      )}
      {state === 'review' && canApprove && (
        <Button disabled={busy} onClick={() => transition('approved')}>
          Aprovar conteúdo
        </Button>
      )}
      {state === 'approved' && (
        <Button disabled={busy} className="min-h-11 w-full" onClick={() => transition('published')}>
          Publicar agora
        </Button>
      )}
      {id && (
        <Button asChild variant="outline">
          <Link to={`/app/experiencias/${id}?preview=1`}>Pré-visualizar</Link>
        </Button>
      )}
      {state === 'published' && id && (
        <Button asChild>
          <Link to={`/experiencias/${slug ?? id}`}>Abrir página pública</Link>
        </Button>
      )}
    </div>
  );
}
