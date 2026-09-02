import { Navigate } from 'react-router-dom';

export function LegacyBrandingRedirect(): React.JSX.Element {
  return <Navigate to="/app/instituicao/perfil/identidade" replace />;
}
