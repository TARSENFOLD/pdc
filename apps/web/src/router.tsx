import React, { Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { NotFoundPage } from '@/pages/NotFoundPage';
import LoginPage from '@/pages/LoginPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import TwoFactorPage from '@/features/auth/TwoFactorPage';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LandingPage } from '@/pages/LandingPage';
import { AppLayout } from '@/components/layout/AppLayout';
import { EscolhaTipoContaPage } from '@/features/auth/EscolhaTipoContaPage';
import { RegistoEstudantePage } from '@/features/auth/RegistoEstudantePage';
import { RegistoMentorPage } from '@/features/auth/RegistoMentorPage';
import { RegistoInstituicaoPage } from '@/features/auth/RegistoInstituicaoPage';
import { useAuth } from '@/lib/auth/AuthContext';
import type { Role } from '@pdc/shared';
import { Spinner } from '@/components/ui';
import { TermosPage } from '@/pages/TermosPage';
import { PrivacidadePage } from '@/pages/PrivacidadePage';

const ReputacaoPage = React.lazy(() => import('@/features/reputacao/ReputacaoPage').then(m => ({ default: m.ReputacaoPage })));

// --- Lazy-loaded /app/* pages ---
const EstudanteDashboard = React.lazy(() => import('@/pages/dashboard/EstudanteDashboard').then(m => ({ default: m.EstudanteDashboard })));
const MentorDashboard = React.lazy(() => import('@/pages/dashboard/MentorDashboard').then(m => ({ default: m.MentorDashboard })));
const InstituicaoDashboard = React.lazy(() => import('@/pages/dashboard/InstituicaoDashboard').then(m => ({ default: m.InstituicaoDashboard })));
const ModeradorDashboard = React.lazy(() => import('@/pages/dashboard/ModeradorDashboard').then(m => ({ default: m.ModeradorDashboard })));
const AdminDashboard = React.lazy(() => import('@/pages/dashboard/AdminDashboard').then(m => ({ default: m.AdminDashboard })));

const CursoListPage = React.lazy(() => import('@/features/cursos/CursoListPage').then(m => ({ default: m.CursoListPage })));
const CursoDetailPage = React.lazy(() => import('@/features/cursos/CursoDetailPage').then(m => ({ default: m.CursoDetailPage })));
const ItemPlayer = React.lazy(() => import('@/features/cursos/ItemPlayer').then(m => ({ default: m.ItemPlayer })));

const ExperienciaListPage = React.lazy(() => import('@/features/experiencias/ExperienciaListPage').then(m => ({ default: m.ExperienciaListPage })));
const ExperienciaDetailPage = React.lazy(() => import('@/features/experiencias/ExperienciaDetailPage').then(m => ({ default: m.ExperienciaDetailPage })));

const PerfilPage = React.lazy(() => import('@/features/perfil/PerfilPage').then(m => ({ default: m.PerfilPage })));
const ConfiguracoesPage = React.lazy(() => import('@/features/perfil/ConfiguracoesPage').then(m => ({ default: m.ConfiguracoesPage })));

const ProjetoListPage = React.lazy(() => import('@/features/projetos/ProjetoListPage').then(m => ({ default: m.ProjetoListPage })));
const ProjetoDetailPage = React.lazy(() => import('@/features/projetos/ProjetoDetailPage').then(m => ({ default: m.ProjetoDetailPage })));
const ProjetoFormPage = React.lazy(() => import('@/features/projetos/ProjetoFormPage').then(m => ({ default: m.ProjetoFormPage })));

const MentoriaListPage = React.lazy(() => import('@/features/mentorias/MentoriaListPage').then(m => ({ default: m.MentoriaListPage })));
const ConquistasPage = React.lazy(() => import('@/features/conquistas/ConquistasPage').then(m => ({ default: m.ConquistasPage })));

const SimulacaoListPage = React.lazy(() => import('@/features/simulacoes/SimulacaoListPage').then(m => ({ default: m.SimulacaoListPage })));
const SimulacaoDetailPage = React.lazy(() => import('@/features/simulacoes/SimulacaoDetailPage').then(m => ({ default: m.SimulacaoDetailPage })));
const SimulacaoPlayerPage = React.lazy(() => import('@/features/simulacoes/SimulacaoPlayerPage').then(m => ({ default: m.SimulacaoPlayerPage })));
const RelatorioVocacional = React.lazy(() => import('@/features/simulacoes/RelatorioVocacional').then(m => ({ default: m.RelatorioVocacional })));

const FeedPage = React.lazy(() => import('@/features/feed/FeedPage').then(m => ({ default: m.FeedPage })));

const DenunciaListPage = React.lazy(() => import('@/features/moderacao/DenunciaListPage').then(m => ({ default: m.DenunciaListPage })));
const DenunciaDetailPage = React.lazy(() => import('@/features/moderacao/DenunciaDetailPage').then(m => ({ default: m.DenunciaDetailPage })));
const FilaAprovacaoPage = React.lazy(() => import('@/features/moderacao/FilaAprovacaoPage').then(m => ({ default: m.FilaAprovacaoPage })));
const ModeradorUtilizadoresPage = React.lazy(() => import('@/features/moderacao/ModeradorUtilizadoresPage').then(m => ({ default: m.ModeradorUtilizadoresPage })));

const VinculosPage = React.lazy(() => import('@/features/vinculos/VinculosPage').then(m => ({ default: m.VinculosPage })));
const MensagensPage = React.lazy(() => import('@/features/mensagens/MensagensPage').then(m => ({ default: m.MensagensPage })));
const ConversaPage = React.lazy(() => import('@/features/mensagens/ConversaPage').then(m => ({ default: m.ConversaPage })));


const AdminUtilizadoresPage = React.lazy(() => import('@/features/admin/AdminUtilizadoresPage').then(m => ({ default: m.AdminUtilizadoresPage })));
const AdminStatsPage = React.lazy(() => import('@/features/admin/AdminStatsPage').then(m => ({ default: m.AdminStatsPage })));
const AdminAuditPage = React.lazy(() => import('@/features/admin/AdminAuditPage').then(m => ({ default: m.AdminAuditPage })));
const LtiPlataformasPage = React.lazy(() => import('@/features/admin/LtiPlataformasPage'));
const FeedWeightsPage = React.lazy(() => import('@/features/admin/FeedWeightsPage'));
const AdminTelemetriaPage = React.lazy(() => import('@/features/admin/AdminTelemetriaPage').then(m => ({ default: m.AdminTelemetriaPage })));
const AdminRelatoriosPage = React.lazy(() => import('@/features/admin/AdminRelatoriosPage').then(m => ({ default: m.AdminRelatoriosPage })));
const FeatureFlagsPage = React.lazy(() => import('@/features/admin/FeatureFlagsPage').then(m => ({ default: m.FeatureFlagsPage })));

const ComiteDashboard = React.lazy(() => import('@/features/comite/ComiteDashboard').then(m => ({ default: m.ComiteDashboard })));
const ValidacaoCientificaPage = React.lazy(() => import('@/features/comite/ValidacaoCientificaPage').then(m => ({ default: m.ValidacaoCientificaPage })));

const InstituicaoExperienciasPage = React.lazy(() => import('@/features/instituicao/InstituicaoExperienciasPage').then(m => ({ default: m.InstituicaoExperienciasPage })));
const CriarExperienciaPage = React.lazy(() => import('@/features/instituicao/CriarExperienciaPage').then(m => ({ default: m.CriarExperienciaPage })));
const InstituicaoProgramasPage = React.lazy(() => import('@/features/instituicao/InstituicaoProgramasPage').then(m => ({ default: m.InstituicaoProgramasPage })));
const CriarProgramaPage = React.lazy(() => import('@/features/instituicao/CriarProgramaPage').then(m => ({ default: m.CriarProgramaPage })));
const EstudantesVinculadosPage = React.lazy(() => import('@/features/instituicao/EstudantesVinculadosPage').then(m => ({ default: m.EstudantesVinculadosPage })));
const PropostasPage = React.lazy(() => import('@/features/instituicao/PropostasPage').then(m => ({ default: m.PropostasPage })));
const RelatoriosInstituicaoPage = React.lazy(() => import('@/features/instituicao/RelatoriosInstituicaoPage').then(m => ({ default: m.RelatoriosInstituicaoPage })));
const BrandingPage = React.lazy(() => import('@/features/instituicao/BrandingPage').then(m => ({ default: m.BrandingPage })));

const MeusCursosPage = React.lazy(() => import('@/features/estudante/MeusCursosPage').then(m => ({ default: m.MeusCursosPage })));
const GuardadosPage = React.lazy(() => import('@/features/estudante/GuardadosPage').then(m => ({ default: m.GuardadosPage })));
const CertificadosPage = React.lazy(() => import('@/features/estudante/CertificadosPage').then(m => ({ default: m.CertificadosPage })));
const RankingPage = React.lazy(() => import('@/features/estudante/RankingPage').then(m => ({ default: m.RankingPage })));

const MentorCursosPage = React.lazy(() => import('@/features/mentor/MentorCursosPage').then(m => ({ default: m.MentorCursosPage })));
const CriarCursoPage = React.lazy(() => import('@/features/mentor/CriarCursoPage').then(m => ({ default: m.CriarCursoPage })));
const MentorSimulacoesPage = React.lazy(() => import('@/features/mentor/MentorSimulacoesPage').then(m => ({ default: m.MentorSimulacoesPage })));
const CriarSimulacaoPage = React.lazy(() => import('@/features/mentor/CriarSimulacaoPage').then(m => ({ default: m.CriarSimulacaoPage })));
const UploadConteudoPage = React.lazy(() => import('@/features/mentor/UploadConteudoPage').then(m => ({ default: m.UploadConteudoPage })));
const EstudantesInscritosPage = React.lazy(() => import('@/features/mentor/EstudantesInscritosPage').then(m => ({ default: m.EstudantesInscritosPage })));
const MentoradosPage = React.lazy(() => import('@/features/mentor/MentoradosPage').then(m => ({ default: m.MentoradosPage })));
const MentorAnalyticsPage = React.lazy(() => import('@/features/mentor/MentorAnalyticsPage').then(m => ({ default: m.MentorAnalyticsPage })));

// --- Lazy-loaded public non-critical pages ---
const ExplorarPage = React.lazy(() => import('@/features/catalogo/ExplorarPage').then(m => ({ default: m.ExplorarPage })));
const CursosCatalogoPage = React.lazy(() => import('@/features/catalogo/CursosCatalogoPage').then(m => ({ default: m.CursosCatalogoPage })));
const CursoPublicoDetailPage = React.lazy(() => import('@/features/catalogo/CursoPublicoDetailPage').then(m => ({ default: m.CursoPublicoDetailPage })));
const SimulacoesCatalogoPage = React.lazy(() => import('@/features/catalogo/SimulacoesCatalogoPage').then(m => ({ default: m.SimulacoesCatalogoPage })));
const SimulacaoPublicoDetailPage = React.lazy(() => import('@/features/catalogo/SimulacaoPublicoDetailPage').then(m => ({ default: m.SimulacaoPublicoDetailPage })));
const MentoresCatalogoPage = React.lazy(() => import('@/features/catalogo/MentoresCatalogoPage').then(m => ({ default: m.MentoresCatalogoPage })));
const MentorPublicoPerfilPage = React.lazy(() => import('@/features/catalogo/MentorPublicoPerfilPage').then(m => ({ default: m.MentorPublicoPerfilPage })));
const InstituicoesCatalogoPage = React.lazy(() => import('@/features/catalogo/InstituicoesCatalogoPage').then(m => ({ default: m.InstituicoesCatalogoPage })));
const InstituicaoPublicoPerfilPage = React.lazy(() => import('@/features/catalogo/InstituicaoPublicoPerfilPage').then(m => ({ default: m.InstituicaoPublicoPerfilPage })));
const PerfilPublicoPage = React.lazy(() => import('@/features/catalogo/PerfilPublicoPage').then(m => ({ default: m.PerfilPublicoPage })));
const ProgramasCatalogoPage = React.lazy(() => import('@/features/catalogo/ProgramasCatalogoPage').then(m => ({ default: m.ProgramasCatalogoPage })));
const ProgramaDetailPage = React.lazy(() => import('@/features/catalogo/ProgramaDetailPage').then(m => ({ default: m.ProgramaDetailPage })));

const ROLE_DASHBOARD: Record<Role, string> = {
  estudante: '/app/dashboard/estudante',
  mentor: '/app/dashboard/mentor',
  instituicao: '/app/dashboard/instituicao',
  moderador: '/app/dashboard/moderador',
  comite_cientifico: '/app/comite',
  super_admin: '/app/dashboard/admin',
};

function DashboardRedirect() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  
  const target = ROLE_DASHBOARD[user.role] ?? '/app/dashboard/estudante';
  return <Navigate to={target} replace />;
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
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}>
          <AppLayout />
        </Suspense>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardRedirect /> },
      { path: 'dashboard/estudante', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><EstudanteDashboard /></Suspense> },
      { path: 'dashboard/mentor', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><MentorDashboard /></Suspense> },
      { path: 'dashboard/instituicao', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><InstituicaoDashboard /></Suspense> },
      { path: 'dashboard/moderador', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><ModeradorDashboard /></Suspense> },
      { path: 'dashboard/admin', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><AdminDashboard /></Suspense> },
      
      { path: 'feed', element: <FeedPage /> },
      { path: 'cursos', element: <CursoListPage /> },
      { path: 'cursos/:id', element: <CursoDetailPage /> },
      { path: 'cursos/:cursoId/itens/:itemId', element: <ItemPlayer /> },
      
      { path: 'simulacoes', element: <SimulacaoListPage /> },
      { path: 'simulacoes/:id', element: <SimulacaoDetailPage /> },
      { path: 'simulacoes/:id/play', element: <SimulacaoPlayerPage /> },
      { path: 'perfil-vocacional', element: <RelatorioVocacional /> },
      
      { path: 'perfil', element: <PerfilPage /> },
      { path: 'configuracoes', element: <ConfiguracoesPage /> },
      { path: 'projetos/novo', element: <ProjetoFormPage /> },
      { path: 'projetos/:id/editar', element: <ProjetoFormPage /> },
      { path: 'mentorias', element: <MentoriaListPage /> },
      { path: 'conquistas', element: <ConquistasPage /> },

      // Estudante
      { path: 'meus-cursos', element: <RoleGuard allowed={['estudante']}><MeusCursosPage /></RoleGuard> },
      { path: 'guardados', element: <RoleGuard allowed={['estudante']}><GuardadosPage /></RoleGuard> },
      { path: 'certificados', element: <RoleGuard allowed={['estudante']}><CertificadosPage /></RoleGuard> },
      { path: 'ranking', element: <RoleGuard allowed={['estudante']}><RankingPage /></RoleGuard> },

      // Mentor
      { path: 'mentor/cursos', element: <RoleGuard allowed={['mentor', 'super_admin']}><MentorCursosPage /></RoleGuard> },
      { path: 'mentor/cursos/criar', element: <RoleGuard allowed={['mentor', 'super_admin']}><CriarCursoPage /></RoleGuard> },
      { path: 'mentor/cursos/:id/editar', element: <RoleGuard allowed={['mentor', 'super_admin']}><CriarCursoPage /></RoleGuard> },
      { path: 'mentor/simulacoes', element: <RoleGuard allowed={['mentor', 'super_admin']}><MentorSimulacoesPage /></RoleGuard> },
      { path: 'mentor/simulacoes/criar', element: <RoleGuard allowed={['mentor', 'super_admin']}><CriarSimulacaoPage /></RoleGuard> },
      { path: 'mentor/simulacoes/:id/editar', element: <RoleGuard allowed={['mentor', 'super_admin']}><CriarSimulacaoPage /></RoleGuard> },
      { path: 'mentor/upload', element: <RoleGuard allowed={['mentor', 'super_admin']}><UploadConteudoPage /></RoleGuard> },
      { path: 'mentor/estudantes/inscritos', element: <RoleGuard allowed={['mentor', 'super_admin']}><EstudantesInscritosPage /></RoleGuard> },
      { path: 'mentor/mentorados', element: <RoleGuard allowed={['mentor', 'super_admin']}><MentoradosPage /></RoleGuard> },
      { path: 'mentor/analytics', element: <RoleGuard allowed={['mentor', 'super_admin']}><MentorAnalyticsPage /></RoleGuard> },

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
      { path: 'reputacao', element: <ReputacaoPage /> },
      {
        path: 'vinculos',
        element: <ProtectedRoute><VinculosPage /></ProtectedRoute>
      },
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
        path: 'instituicao/editar-programa/:id',
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
      {
        path: 'admin/telemetria',
        element: <RoleGuard allowed={['super_admin']}><AdminTelemetriaPage /></RoleGuard>
      },
      {
        path: 'admin/relatorios',
        element: <RoleGuard allowed={['super_admin']}><AdminRelatoriosPage /></RoleGuard>
      },
      {
        path: 'admin/feature-flags',
        element: <RoleGuard allowed={['super_admin']}><FeatureFlagsPage /></RoleGuard>
      },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <Navigate to="/criar-conta" replace /> },
  { path: '/verificar', element: <TwoFactorPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/projetos', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><ProjetoListPage /></Suspense> },
  { path: '/projetos/:id', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><ProjetoDetailPage /></Suspense> },
  { path: '/experiencias', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><ExperienciaListPage /></Suspense> },
  { path: '/experiencias/:id', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><ExperienciaDetailPage /></Suspense> },
  { path: '/explorar', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><ExplorarPage /></Suspense> },
  { path: '/cursos', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><CursosCatalogoPage /></Suspense> },
  { path: '/cursos/:slug', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><CursoPublicoDetailPage /></Suspense> },
  { path: '/simulacoes', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><SimulacoesCatalogoPage /></Suspense> },
  { path: '/simulacoes/:slug', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><SimulacaoPublicoDetailPage /></Suspense> },
  { path: '/mentores', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><MentoresCatalogoPage /></Suspense> },
  { path: '/mentores/:id', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><MentorPublicoPerfilPage /></Suspense> },
  { path: '/programas', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><ProgramasCatalogoPage /></Suspense> },
  { path: '/programas/:id', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><ProgramaDetailPage /></Suspense> },
  { path: '/instituicoes', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><InstituicoesCatalogoPage /></Suspense> },
  { path: '/instituicoes/:slug', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><InstituicaoPublicoPerfilPage /></Suspense> },
  { path: '/perfil/:id', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><PerfilPublicoPage /></Suspense> },
  { path: '/criar-conta', element: <EscolhaTipoContaPage /> },
  { path: '/criar-conta/estudante', element: <RegistoEstudantePage /> },
  { path: '/criar-conta/mentor', element: <RegistoMentorPage /> },
  { path: '/criar-conta/instituicao', element: <RegistoInstituicaoPage /> },
  { path: '/termos', element: <TermosPage /> },
  { path: '/privacidade', element: <PrivacidadePage /> },
  { path: '*', element: <NotFoundPage /> },
]);
