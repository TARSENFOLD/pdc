import { createBrowserRouter, Navigate } from 'react-router-dom';
import { NotFoundPage } from '@/pages/NotFoundPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import TwoFactorPage from '@/features/auth/TwoFactorPage';
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
import FeedPage from '@/features/feed/FeedPage';

import { DenunciaListPage } from '@/features/moderacao/DenunciaListPage';
import { DenunciaDetailPage } from '@/features/moderacao/DenunciaDetailPage';
import { FilaAprovacaoPage } from '@/features/moderacao/FilaAprovacaoPage';
import { ModeradorUtilizadoresPage } from '@/features/moderacao/ModeradorUtilizadoresPage';

import { VinculosPage } from '@/features/vinculos/VinculosPage';
import { MensagensPage } from '@/features/mensagens/MensagensPage';
import { ConversaPage } from '@/features/mensagens/ConversaPage';
import { AdminUtilizadoresPage } from '@/features/admin/AdminUtilizadoresPage';
import { AdminStatsPage } from '@/features/admin/AdminStatsPage';
import { AdminAuditPage } from '@/features/admin/AdminAuditPage';
import LtiPlataformasPage from '@/features/admin/LtiPlataformasPage';
import FeedWeightsPage from '@/features/admin/FeedWeightsPage';

import { ExplorarPage } from '@/features/catalogo/ExplorarPage';
import { CursosCatalogoPage } from '@/features/catalogo/CursosCatalogoPage';
import { CursoPublicoDetailPage } from '@/features/catalogo/CursoPublicoDetailPage';
import { SimulacoesCatalogoPage } from '@/features/catalogo/SimulacoesCatalogoPage';
import { SimulacaoPublicoDetailPage } from '@/features/catalogo/SimulacaoPublicoDetailPage';
import { MentoresCatalogoPage } from '@/features/catalogo/MentoresCatalogoPage';
import { MentorPublicoPerfilPage } from '@/features/catalogo/MentorPublicoPerfilPage';
import { InstituicoesCatalogoPage } from '@/features/catalogo/InstituicoesCatalogoPage';
import { InstituicaoPublicoPerfilPage } from '@/features/catalogo/InstituicaoPublicoPerfilPage';
import { PerfilPublicoPage } from '@/features/catalogo/PerfilPublicoPage';
import { EscolhaTipoContaPage } from '@/features/auth/EscolhaTipoContaPage';
import { RegistoEstudantePage } from '@/features/auth/RegistoEstudantePage';
import { RegistoMentorPage } from '@/features/auth/RegistoMentorPage';
import { RegistoInstituicaoPage } from '@/features/auth/RegistoInstituicaoPage';

import { ComiteDashboard } from '@/features/comite/ComiteDashboard';
import { ValidacaoCientificaPage } from '@/features/comite/ValidacaoCientificaPage';

import { InstituicaoExperienciasPage } from '@/features/instituicao/InstituicaoExperienciasPage';
import { CriarExperienciaPage } from '@/features/instituicao/CriarExperienciaPage';
import { InstituicaoProgramasPage } from '@/features/instituicao/InstituicaoProgramasPage';
import { CriarProgramaPage } from '@/features/instituicao/CriarProgramaPage';
import { EstudantesVinculadosPage } from '@/features/instituicao/EstudantesVinculadosPage';
import { PropostasPage } from '@/features/instituicao/PropostasPage';
import { RelatoriosInstituicaoPage } from '@/features/instituicao/RelatoriosInstituicaoPage';
import { BrandingPage } from '@/features/instituicao/BrandingPage';

import { MeusCursosPage } from '@/features/aluno/MeusCursosPage';
import { GuardadosPage } from '@/features/aluno/GuardadosPage';
import { CertificadosPage } from '@/features/aluno/CertificadosPage';

import { useAuth } from '@/lib/auth/AuthContext';
import type { Role } from '@pdc/shared';
import { Spinner } from '@/components/ui';

const ROLE_DASHBOARD: Record<Role, string> = {
  aluno: '/app/dashboard/aluno',
  mentor: '/app/dashboard/mentor',
  instituicao: '/app/dashboard/instituicao',
  moderador: '/app/dashboard/moderador',
  comite_cientifico: '/app/comite',
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
      
      { path: 'feed', element: <FeedPage /> },
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

      // Aluno
      { path: 'meus-cursos', element: <RoleGuard allowed={['aluno']}><MeusCursosPage /></RoleGuard> },
      { path: 'guardados', element: <RoleGuard allowed={['aluno']}><GuardadosPage /></RoleGuard> },
      { path: 'certificados', element: <RoleGuard allowed={['aluno']}><CertificadosPage /></RoleGuard> },

      // Moderacao
      {
        path: 'moderacao/denuncias',
        element: <RoleGuard allowed={['moderador', 'super_admin']}><DenunciaListPage /></RoleGuard>
      },
      {
        path: 'moderacao/denuncias/:id',
        element: <RoleGuard allowed={['moderador', 'super_admin']}><DenunciaDetailPage /></RoleGuard>
      },
      {
        path: 'moderacao/aprovacoes',
        element: <RoleGuard allowed={['moderador', 'comite_cientifico', 'super_admin']}><FilaAprovacaoPage /></RoleGuard>
      },
      {
        path: 'moderador/utilizadores',
        element: <RoleGuard allowed={['moderador', 'super_admin']}><ModeradorUtilizadoresPage /></RoleGuard>
      },

      // Vínculos
      {
        path: 'vinculos',
        element: <ProtectedRoute><VinculosPage /></ProtectedRoute>
      },

      // Mensagens
      {
        path: 'mensagens',
        element: <ProtectedRoute><MensagensPage /></ProtectedRoute>
      },
      {
        path: 'mensagens/:conversaId',
        element: <ProtectedRoute><ConversaPage /></ProtectedRoute>
      },

      // Comité Científico
      {
        path: 'comite',
        element: <RoleGuard allowed={['comite_cientifico', 'super_admin']}><ComiteDashboard /></RoleGuard>
      },
      {
        path: 'comite/validacao',
        element: <RoleGuard allowed={['comite_cientifico', 'super_admin']}><ValidacaoCientificaPage /></RoleGuard>
      },

      // Instituição
      {
        path: 'instituicao/experiencias',
        element: <RoleGuard allowed={['instituicao', 'super_admin']}><InstituicaoExperienciasPage /></RoleGuard>
      },
      {
        path: 'instituicao/editar-experiencia/:id',
        element: <RoleGuard allowed={['instituicao', 'super_admin']}><CriarExperienciaPage /></RoleGuard>
      },
      {
        path: 'instituicao/criar-experiencia',
        element: <RoleGuard allowed={['instituicao', 'super_admin']}><CriarExperienciaPage /></RoleGuard>
      },
      {
        path: 'instituicao/programas',
        element: <RoleGuard allowed={['instituicao', 'super_admin']}><InstituicaoProgramasPage /></RoleGuard>
      },
      {
        path: 'instituicao/criar-programa',
        element: <RoleGuard allowed={['instituicao', 'super_admin']}><CriarProgramaPage /></RoleGuard>
      },
      {
        path: 'instituicao/estudantes-vinculados',
        element: <RoleGuard allowed={['instituicao', 'super_admin']}><EstudantesVinculadosPage /></RoleGuard>
      },
      {
        path: 'instituicao/propostas',
        element: <RoleGuard allowed={['instituicao', 'super_admin']}><PropostasPage /></RoleGuard>
      },
      {
        path: 'instituicao/relatorios',
        element: <RoleGuard allowed={['instituicao', 'super_admin']}><RelatoriosInstituicaoPage /></RoleGuard>
      },
      {
        path: 'instituicao/branding',
        element: <RoleGuard allowed={['instituicao', 'super_admin']}><BrandingPage /></RoleGuard>
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
      {
        path: 'admin/feed-weights',
        element: <RoleGuard allowed={['super_admin']}><FeedWeightsPage /></RoleGuard>
      },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/verificar', element: <TwoFactorPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/projetos', element: <ProjetoListPage /> },
  { path: '/projetos/:id', element: <ProjetoDetailPage /> },
  { path: '/experiencias', element: <ExperienciaListPage /> },
  { path: '/experiencias/:id', element: <ExperienciaDetailPage /> },
  { path: '/explorar', element: <ExplorarPage /> },
  { path: '/cursos', element: <CursosCatalogoPage /> },
  { path: '/cursos/:slug', element: <CursoPublicoDetailPage /> },
  { path: '/simulacoes', element: <SimulacoesCatalogoPage /> },
  { path: '/simulacoes/:slug', element: <SimulacaoPublicoDetailPage /> },
  { path: '/mentores', element: <MentoresCatalogoPage /> },
  { path: '/mentores/:id', element: <MentorPublicoPerfilPage /> },
  { path: '/instituicoes', element: <InstituicoesCatalogoPage /> },
  { path: '/instituicoes/:slug', element: <InstituicaoPublicoPerfilPage /> },
  { path: '/perfil/:id', element: <PerfilPublicoPage /> },
  { path: '/criar-conta', element: <EscolhaTipoContaPage /> },
  { path: '/criar-conta/estudante', element: <RegistoEstudantePage /> },
  { path: '/criar-conta/mentor', element: <RegistoMentorPage /> },
  { path: '/criar-conta/instituicao', element: <RegistoInstituicaoPage /> },
  { path: '*', element: <NotFoundPage /> },
]);
