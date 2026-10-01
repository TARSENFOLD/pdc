import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '@/components/ui';

type Props = {
  vwx: boolean;
  state: string;
  message: string;
  busy: boolean;
  canApprove: boolean;
  hasPublishedVersion?: boolean | undefined;
  rejectionReason?: string | null | undefined;
  id: string | undefined;
  slug: string | undefined;
  save: (submit?: boolean) => void;
  transition: (state: string, reason?: string) => void;
};
export function ExperiencePublishActions({
  vwx,
  state,
  message,
  busy,
  canApprove,
  hasPublishedVersion,
  rejectionReason,
  id,
  slug,
  save,
  transition,
}: Props) {
  const [reason, setReason] = useState('');
  return (
    <div className="space-y-4">
      <p className="text-ink-secondary text-sm">
        {vwx
          ? 'Prática profissional gratuita, produzida pelo PDC com a entidade parceira.'
          : 'Experiência institucional gratuita para apoiar a escolha de formação.'}
      </p>
      <p className="text-sm">Estado: {state}</p>
      {state === 'rejected' && rejectionReason && (
        <p role="status">Correção pedida: {rejectionReason}</p>
      )}
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
        <>
          <Button disabled={busy} onClick={() => transition('approved')}>
            Aprovar conteúdo
          </Button>
          <label className="block text-sm">
            Motivo da devolução
            <textarea
              className="mt-1 w-full rounded border p-2"
              value={reason}
              maxLength={500}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <Button
            variant="outline"
            disabled={busy || reason.trim().length < 10}
            onClick={() => transition('rejected', reason.trim())}
          >
            Devolver para correção
          </Button>
        </>
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
      {hasPublishedVersion && id && (
        <>
          <Button asChild>
            <Link to={`/experiencias/${slug ?? id}`}>Abrir página pública</Link>
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => transition('archived')}>
            Arquivar publicação
          </Button>
        </>
      )}
    </div>
  );
}
