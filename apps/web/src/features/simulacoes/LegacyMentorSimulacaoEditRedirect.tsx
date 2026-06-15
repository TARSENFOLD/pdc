import type { ReactElement } from 'react';
import { Navigate, useParams } from 'react-router-dom';

export function LegacyMentorSimulacaoEditRedirect(): ReactElement {
  const { id } = useParams<{ id: string }>();
  if (!id) return <Navigate to="/app/mentor/simulacoes" replace />;
  return <Navigate to={`/app/mentor/simulacoes/${encodeURIComponent(id)}/editar`} replace />;
}
