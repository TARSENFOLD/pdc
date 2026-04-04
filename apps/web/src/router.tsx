import { createBrowserRouter, Navigate, RouteObject } from 'react-router-dom';
import { NotFoundPage } from '@/pages/NotFoundPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LandingPage } from '@/pages/LandingPage';
import { AppLayout } from '@/components/layout/AppLayout';
import { AlunoDashboard } from '@/pages/dashboard/AlunoDashboard';
import { MentorDashboard } from '@/pages/dashboard/MentorDashboard';
import { InstituicaoDashboard } from '@/pages/dashboard/InstituicaoDashboard';
import { ModeradorDashboard } from '@/pages/dashboard/ModeradorDashboard';
import { AdminDashboard } from '@/pages/dashboard/AdminDashboard';
import { CursoListPage } from '@/features/cursos/CursoListPage';
import { CursoDetailPage } from '@/features/cursos/CursoDetailPage';
import { ItemPlayer } from '@/features/cursos/ItemPlayer';
import { ExperienciaListPage } from '@/features/experiencias/ExperienciaListPage';
import { ExperienciaDetailPage } from '@/features/experiencias/ExperienciaDetailPage';
import { PerfilPage } from '@/features/perfil/PerfilPage';
import { ProjetoListPage } from '@/features/projetos/ProjetoListPage';
import { ProjetoDetailPage } from '@/features/projetos/ProjetoDetailPage';
import { ProjetoFormPage } from '@/features/projetos/ProjetoFormPage';
import { MentoriaListPage } from '@/features/mentorias/MentoriaListPage';
import { ConquistasPage } from '@/features/conquistas/ConquistasPage';
import { SimulacaoListPage } from '@/features/simulacoes/SimulacaoListPage';
import { SimulacaoDetailPage } from '@/features/simulacoes/SimulacaoDetailPage';
import { SimulacaoPlayerPage } from '@/features/simulacoes/SimulacaoPlayerPage';
import { RelatorioVocacional } from '@/features/simulacoes/RelatorioVocacional';

import { DenunciaListPage } from '@/features/moderacao/DenunciaListPage';
import { DenunciaDetailPage } from '@/features/moderacao/DenunciaDetailPage';
import { AdminUtilizadoresPage } from '@/features/admin/AdminUtilizadoresPage';
import { AdminStatsPage } from '@/features/admin/AdminStatsPage';
import { AdminAuditPage } from '@/features/admin/AdminAuditPage';
import LtiPlataformasPage from '@/features/admin/LtiPlataformasPage';

import { useAuth } from '@/lib/auth/AuthContext';
import type { Role } from '@pdc/shared';
import { Spinner } from '@/components/ui';

const ROLE_DASHBOARD: Record<Role, string> = {
  aluno: '/app/dashboard/aluno',
  mentor: '/app/dashboard/mentor',
  instituicao: '/app/dashboard/instituicao',
  moderador: '/app/dashboard/moderador',
  comite_cientifico: '/app/dashboard/admin',
  super_admin: '/app/dashboard/admin',
};

function DashboardRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_DASHBOARD[user.role]} replace />;
}

function RoleGuard({ allowed, children }: { allowed: Role[]; children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>;
  if (!user || !allowed.includes(user.role)) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/app',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardRedirect /> },
      { path: 'dashboard/aluno', element: <AlunoDashboard /> },
      { path: 'dashboard/mentor', element: <MentorDashboard /> },
      { path: 'dashboard/instituicao', element: <InstituicaoDashboard /> },
      { path: 'dashboard/moderador', element: <ModeradorDashboard /> },
      { path: 'dashboard/admin', element: <AdminDashboard /> },
      
      { path: 'cursos', element: <CursoListPage /> },
      { path: 'cursos/:id', element: <CursoDetailPage /> },
      { path: 'cursos/:cursoId/itens/:itemId', element: <ItemPlayer /> },
      
      { path: 'simulacoes', element: <SimulacaoListPage /> },
      { path: 'simulacoes/:id', element: <SimulacaoDetailPage /> },
      { path: 'simulacoes/:id/play', element: <SimulacaoPlayerPage /> },
      { path: 'perfil-vocacional', element: <RelatorioVocacional /> },
      
      { path: 'perfil', element: <PerfilPage /> },
      { path: 'projetos/novo', element: <ProjetoFormPage /> },
      { path: 'projetos/:id/editar', element: <ProjetoFormPage /> },
      { path: 'mentorias', element: <MentoriaListPage /> },
      { path: 'conquistas', element: <ConquistasPage /> },

      // Moderacao
      { 
        path: 'moderacao/denuncias', 
        element: <RoleGuard allowed={['moderador', 'super_admin']}><DenunciaListPage /></RoleGuard> 
      },
      { 
        path: 'moderacao/denuncias/:id', 
        element: <RoleGuard allowed={['moderador', 'super_admin']}><DenunciaDetailPage /></RoleGuard> 
      },

      // Admin
      { 
        path: 'admin/utilizadores', 
        element: <RoleGuard allowed={['super_admin']}><AdminUtilizadoresPage /></RoleGuard> 
      },
      { 
        path: 'admin/stats', 
        element: <RoleGuard allowed={['super_admin', 'moderador']}><AdminStatsPage /></RoleGuard> 
      },
      { 
        path: 'admin/audit', 
        element: <RoleGuard allowed={['super_admin']}><AdminAuditPage /></RoleGuard> 
      },
      {
        path: 'admin/lti',
        element: <RoleGuard allowed={['super_admin']}><LtiPlataformasPage /></RoleGuard>
      },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/projetos', element: <ProjetoListPage /> },
  { path: '/projetos/:id', element: <ProjetoDetailPage /> },
  { path: '/experiencias', element: <ExperienciaListPage /> },
  { path: '/experiencias/:id', element: <ExperienciaDetailPage /> },
  { path: '*', element: <NotFoundPage /> },
]);
