import React, { Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { NotFoundPage } from '@/pages/NotFoundPage';
import LoginPage from '@/pages/LoginPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import TwoFactorPage from '@/features/auth/TwoFactorPage';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LandingPage } from '@/pages/LandingPage';
import AppLayout from '@/components/layout/AppLayout';
import { EscolhaTipoContaPage } from '@/features/auth/EscolhaTipoContaPage';
import { RegistoEstudantePage } from '@/features/auth/RegistoEstudantePage';
import { RegistoMentorPage } from '@/features/auth/RegistoMentorPage';
import { RegistoInstituicaoPage } from '@/features/auth/RegistoInstituicaoPage';
import { FinalizarOAuthPage } from '@/features/auth/FinalizarOAuthPage';
import { Spinner } from '@/components/ui';
import { TermosPage } from '@/pages/TermosPage';
import { PrivacidadePage } from '@/pages/PrivacidadePage';
import { DashboardRedirect, RoleGuard } from './router-guards';

const ReputacaoPage = React.lazy(() => import('@/features/reputacao/ReputacaoPage').then(m => ({ default: m.ReputacaoPage })));

// --- Lazy-loaded /app/* pages ---
const EstudanteDashboard = React.lazy(() => import('@/pages/dashboard/EstudanteDashboard').then(m => ({ default: m.EstudanteDashboard })));
const MentorDashboard = React.lazy(() => import('@/pages/dashboard/MentorDashboard').then(m => ({ default: m.MentorDashboard })));
const InstituicaoDashboard = React.lazy(() => import('@/pages/dashboard/InstituicaoDashboard').then(m => ({ default: m.InstituicaoDashboard })));
const ModeradorDashboard = React.lazy(() => import('@/pages/dashboard/ModeradorDashboard').then(m => ({ default: m.ModeradorDashboard })));
const AdminDashboard = React.lazy(() => import('@/pages/dashboard/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const PatrocinadorDashboard = React.lazy(() => import('@/pages/dashboard/PatrocinadorDashboard').then(m => ({ default: m.PatrocinadorDashboard })));

const CursoDetailPage = React.lazy(() => import('@/features/cursos/CursoDetailPage').then(m => ({ default: m.CursoDetailPage })));
const ItemPlayer = React.lazy(() => import('@/features/cursos/ItemPlayer').then(m => ({ default: m.ItemPlayer })));

const ExperienciaListPage = React.lazy(() => import('@/features/experiencias/ExperienciaListPage').then(m => ({ default: m.ExperienciaListPage })));
const ExperienciaDetailPage = React.lazy(() => import('@/features/experiencias/ExperienciaDetailPage').then(m => ({ default: m.ExperienciaDetailPage })));
const ExperienciasCatalogoPage = React.lazy(() => import('@/features/catalogo/ExperienciasCatalogoPage'));

const PerfilPage = React.lazy(() => import('@/features/perfil/PerfilPage'));
const EditPerfilPage = React.lazy(() => import('@/features/perfil/EditPerfilPage'));
const ConfiguracoesPage = React.lazy(() => import('@/features/perfil/ConfiguracoesPage').then(m => ({ default: m.ConfiguracoesPage })));

const ProjetoListPage = React.lazy(() => import('@/features/projetos/ProjetoListPage').then(m => ({ default: m.ProjetoListPage })));
const ProjetoDetailPage = React.lazy(() => import('@/features/projetos/ProjetoDetailPage').then(m => ({ default: m.ProjetoDetailPage })));
const ProjetoFormPage = React.lazy(() => import('@/features/projetos/ProjetoFormPage').then(m => ({ default: m.ProjetoFormPage })));

const MentoriaListPage = React.lazy(() => import('@/features/mentorias/MentoriaListPage').then(m => ({ default: m.MentoriaListPage })));
const ConquistasPage = React.lazy(() => import('@/features/conquistas/ConquistasPage').then(m => ({ default: m.ConquistasPage })));

const SimulacaoDetailPage = React.lazy(() => import('@/features/simulacoes/SimulacaoDetailPage').then(m => ({ default: m.SimulacaoDetailPage })));
const SimulacaoPlayerPage = React.lazy(() => import('@/features/simulacoes/SimulacaoPlayerPage').then(m => ({ default: m.SimulacaoPlayerPage })));
const RelatorioVocacional = React.lazy(() => import('@/features/simulacoes/RelatorioVocacional').then(m => ({ default: m.RelatorioVocacional })));

const FeedPage = React.lazy(() => import('@/features/feed/FeedPage').then(m => ({ default: m.FeedPage })));
const FeedPostDetailPage = React.lazy(() => import('@/features/feed/FeedPostDetailPage').then(m => ({ default: m.FeedPostDetailPage })));
const PostComposer = React.lazy(() => import('@/features/feed/PostComposer'));
const ConquistaManualComposer = React.lazy(() => import('@/features/conquistas/ConquistaManualComposer'));

const DenunciaListPage = React.lazy(() => import('@/features/moderacao/DenunciaListPage').then(m => ({ default: m.DenunciaListPage })));
const DenunciaDetailPage = React.lazy(() => import('@/features/moderacao/DenunciaDetailPage').then(m => ({ default: m.DenunciaDetailPage })));
const FilaAprovacaoPage = React.lazy(() => import('@/features/moderacao/FilaAprovacaoPage').then(m => ({ default: m.FilaAprovacaoPage })));
const ModeradorUtilizadoresPage = React.lazy(() => import('@/features/moderacao/ModeradorUtilizadoresPage').then(m => ({ default: m.ModeradorUtilizadoresPage })));

const VinculosPage = React.lazy(() => import('@/features/vinculos/VinculosPage'));
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
const CriarProgramaPage = React.lazy(() => import('@/features/instituicao/CriarProgramaPage'));
const EstudantesVinculadosPage = React.lazy(() => import('@/features/instituicao/EstudantesVinculadosPage').then(m => ({ default: m.EstudantesVinculadosPage })));
const PropostasPage = React.lazy(() => import('@/features/instituicao/PropostasPage').then(m => ({ default: m.PropostasPage })));
const RelatoriosInstituicaoPage = React.lazy(() => import('@/features/instituicao/RelatoriosInstituicaoPage').then(m => ({ default: m.RelatoriosInstituicaoPage })));
const BrandingPage = React.lazy(() => import('@/features/instituicao/BrandingPage').then(m => ({ default: m.BrandingPage })));

const MeusCursosPage = React.lazy(() => import('@/features/estudante/MeusCursosPage').then(m => ({ default: m.MeusCursosPage })));
const MeusProgramasPage = React.lazy(() => import('@/features/estudante/MeusProgramasPage').then(m => ({ default: m.MeusProgramasPage })));
const GuardadosPage = React.lazy(() => import('@/features/estudante/GuardadosPage').then(m => ({ default: m.GuardadosPage })));
const CertificadosPage = React.lazy(() => import('@/features/estudante/CertificadosPage').then(m => ({ default: m.CertificadosPage })));
const RankingPage = React.lazy(() => import('@/features/estudante/RankingPage').then(m => ({ default: m.RankingPage })));

const MentorCursosPage = React.lazy(() => import('@/features/mentor/MentorCursosPage').then(m => ({ default: m.MentorCursosPage })));
const MentorSimulacoesPage = React.lazy(() => import('@/features/mentor/MentorSimulacoesPage').then(m => ({ default: m.MentorSimulacoesPage })));
const CriarSimulacaoPage = React.lazy(() => import('@/features/mentor/CriarSimulacaoPage').then(m => ({ default: m.CriarSimulacaoPage })));
const UploadConteudoPage = React.lazy(() => import('@/features/mentor/UploadConteudoPage').then(m => ({ default: m.UploadConteudoPage })));
const EstudantesInscritosPage = React.lazy(() => import('@/features/mentor/EstudantesInscritosPage').then(m => ({ default: m.EstudantesInscritosPage })));
const MentoradosPage = React.lazy(() => import('@/features/mentor/MentoradosPage').then(m => ({ default: m.MentoradosPage })));
const MentorAnalyticsPage = React.lazy(() => import('@/features/mentor/MentorAnalyticsPage').then(m => ({ default: m.MentorAnalyticsPage })));

const SovereignCourseBuilder = React.lazy(() => import('@/features/instituicao/SovereignCourseBuilder').then(m => ({ default: m.SovereignCourseBuilder })));
const HomePage = React.lazy(() => import('@/features/home/HomePage'));

// --- Lazy-loaded public non-critical pages ---
const ExplorarPage = React.lazy(() => import('@/features/catalogo/ExplorarPage'));
const CursosCatalogoPage = React.lazy(() => import('@/features/catalogo/CursosCatalogoPage'));
const CursoPublicoDetailPage = React.lazy(() => import('@/features/catalogo/CursoPublicoDetailPage').then(m => ({ default: m.CursoPublicoDetailPage })));
const SimulacoesCatalogoPage = React.lazy(() => import('@/features/catalogo/SimulacoesCatalogoPage'));
const SimulacaoPublicoDetailPage = React.lazy(() => import('@/features/catalogo/SimulacaoPublicoDetailPage').then(m => ({ default: m.SimulacaoPublicoDetailPage })));
const MentoresCatalogoPage = React.lazy(() => import('@/features/catalogo/MentoresCatalogoPage').then(m => ({ default: m.MentoresCatalogoPage })));
const MentorPublicoPerfilPage = React.lazy(() => import('@/features/catalogo/MentorPublicoPerfilPage').then(m => ({ default: m.MentorPublicoPerfilPage })));
const InstituicoesCatalogoPage = React.lazy(() => import('@/features/catalogo/InstituicoesCatalogoPage'));
const InstituicaoPublicoPerfilPage = React.lazy(() => import('@/features/catalogo/InstituicaoPublicoPerfilPage').then(m => ({ default: m.InstituicaoPublicoPerfilPage })));
const PerfilPublicoPage = React.lazy(() => import('@/features/catalogo/PerfilPublicoPage'));
const ProgramasCatalogoPage = React.lazy(() => import('@/features/catalogo/ProgramasCatalogoPage'));
const ProgramaDetailPage = React.lazy(() => import('@/features/catalogo/ProgramaDetailPage').then(m => ({ default: m.ProgramaDetailPage })));

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
      { path: 'home', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><HomePage /></Suspense> },
      { path: 'dashboard/estudante', element: <RoleGuard allowed={['estudante', 'super_admin']}><Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><EstudanteDashboard /></Suspense></RoleGuard> },
      { path: 'dashboard/mentor', element: <RoleGuard allowed={['mentor', 'super_admin']}><Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><MentorDashboard /></Suspense></RoleGuard> },
      { path: 'dashboard/instituicao', element: <RoleGuard allowed={['instituicao', 'super_admin']}><Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><InstituicaoDashboard /></Suspense></RoleGuard> },
      { path: 'dashboard/moderador', element: <RoleGuard allowed={['moderador', 'super_admin']}><Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><ModeradorDashboard /></Suspense></RoleGuard> },
      { path: 'dashboard/comite', element: <RoleGuard allowed={['comite_cientifico', 'super_admin']}><Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><ComiteDashboard /></Suspense></RoleGuard> },
      { path: 'dashboard/admin', element: <RoleGuard allowed={['super_admin']}><Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><AdminDashboard /></Suspense></RoleGuard> },
      { path: 'dashboard/patrocinador', element: <RoleGuard allowed={['patrocinador', 'super_admin']}><Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><PatrocinadorDashboard /></Suspense></RoleGuard> },
      
      { path: 'feed', element: <FeedPage /> },
      { path: 'feed/criar', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><PostComposer /></Suspense> },
      { path: 'feed-posts/:id', element: <FeedPostDetailPage /> },
      { path: 'cursos', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><CursosCatalogoPage /></Suspense> },
      { path: 'cursos/:id', element: <CursoDetailPage /> },
      { path: 'cursos/:cursoId/itens/:itemId', element: <ItemPlayer /> },

      { path: 'experiencias', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><ExperienciasCatalogoPage /></Suspense> },
      { path: 'experiencias/:id', element: <ExperienciaDetailPage /> },
      { path: 'programas', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><ProgramasCatalogoPage /></Suspense> },
      { path: 'programas/:id', element: <ProgramaDetailPage /> },
      { path: 'explorar', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><ExplorarPage /></Suspense> },
      { path: 'mentores/:id', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><MentorPublicoPerfilPage /></Suspense> },
      { path: 'instituicoes/:slug', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><InstituicaoPublicoPerfilPage /></Suspense> },

      { path: 'simulacoes', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><SimulacoesCatalogoPage /></Suspense> },
      { path: 'simulacoes/:id', element: <SimulacaoDetailPage /> },
      { path: 'simulacoes/:id/play', element: <SimulacaoPlayerPage /> },
      { path: 'perfil-vocacional', element: <RelatorioVocacional /> },
      
      { path: 'perfil', element: <PerfilPage /> },
      { path: 'perfil/editar', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><EditPerfilPage /></Suspense> },
      { path: 'perfil/:id', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><PerfilPublicoPage /></Suspense> },
      { path: 'configuracoes', element: <ConfiguracoesPage /> },
      { path: 'projetos', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><ProjetoListPage /></Suspense> },
      { path: 'projetos/novo', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><ProjetoFormPage /></Suspense> },
      { path: 'projetos/:id', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><ProjetoDetailPage /></Suspense> },
      { path: 'projetos/:id/editar', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><ProjetoFormPage /></Suspense> },
      { path: 'mentorias', element: <MentoriaListPage /> },
      { path: 'conquistas', element: <ConquistasPage /> },
      { path: 'conquistas/criar', element: <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}><ConquistaManualComposer /></Suspense> },

      // Estudante
      { path: 'meus-cursos', element: <RoleGuard allowed={['estudante']}><MeusCursosPage /></RoleGuard> },
      { path: 'meus-programas', element: <RoleGuard allowed={['estudante']}><MeusProgramasPage /></RoleGuard> },
      { path: 'guardados', element: <RoleGuard allowed={['estudante']}><GuardadosPage /></RoleGuard> },
      { path: 'certificados', element: <RoleGuard allowed={['estudante']}><CertificadosPage /></RoleGuard> },
      { path: 'ranking', element: <RoleGuard allowed={['estudante', 'mentor', 'instituicao', 'super_admin']}><RankingPage /></RoleGuard> },

      // Mentor
      { path: 'mentor/cursos', element: <RoleGuard allowed={['mentor', 'instituicao', 'super_admin']}><MentorCursosPage /></RoleGuard> },
      { path: 'mentor/cursos/criar', element: <RoleGuard allowed={['mentor', 'instituicao', 'super_admin']}><SovereignCourseBuilder /></RoleGuard> },
      { path: 'mentor/cursos/:id/editar', element: <RoleGuard allowed={['mentor', 'instituicao', 'super_admin']}><SovereignCourseBuilder /></RoleGuard> },
      { path: 'instituicao/cursos/criar', element: <RoleGuard allowed={['instituicao', 'super_admin']}><SovereignCourseBuilder /></RoleGuard> },
      { path: 'instituicao/cursos', element: <RoleGuard allowed={['instituicao', 'super_admin']}><MentorCursosPage /></RoleGuard> },
      { path: 'instituicao/cursos/:id/editar', element: <RoleGuard allowed={['instituicao', 'super_admin']}><SovereignCourseBuilder /></RoleGuard> },
      { path: 'instituicao/simulacoes', element: <RoleGuard allowed={['instituicao', 'super_admin']}><MentorSimulacoesPage /></RoleGuard> },
      { path: 'instituicao/simulacoes/criar', element: <RoleGuard allowed={['instituicao', 'super_admin']}><CriarSimulacaoPage /></RoleGuard> },
      { path: 'instituicao/simulacoes/:id/editar', element: <RoleGuard allowed={['instituicao', 'super_admin']}><CriarSimulacaoPage /></RoleGuard> },
      { path: 'mentor/simulacoes', element: <RoleGuard allowed={['mentor', 'instituicao', 'super_admin']}><MentorSimulacoesPage /></RoleGuard> },
      { path: 'mentor/simulacoes/criar', element: <RoleGuard allowed={['mentor', 'instituicao', 'super_admin']}><CriarSimulacaoPage /></RoleGuard> },
      { path: 'mentor/simulacoes/:id/editar', element: <RoleGuard allowed={['mentor', 'instituicao', 'super_admin']}><CriarSimulacaoPage /></RoleGuard> },
      { path: 'mentor/simulacoes/editar/:id', element: <RoleGuard allowed={['mentor', 'instituicao', 'super_admin']}><CriarSimulacaoPage /></RoleGuard> },
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

      { path: 'reputacao', element: <ReputacaoPage /> },
      { path: 'vinculos', element: <VinculosPage /> },
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
        element: <Navigate to="/app/dashboard/comite" replace />
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
  { path: '/auth/recuperar', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
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
  { path: '/criar-conta/finalizar', element: <FinalizarOAuthPage /> },
  { path: '/criar-conta/estudante', element: <RegistoEstudantePage /> },
  { path: '/criar-conta/mentor', element: <RegistoMentorPage /> },
  { path: '/criar-conta/instituicao', element: <RegistoInstituicaoPage /> },
  { path: '/termos', element: <TermosPage /> },
  { path: '/privacidade', element: <PrivacidadePage /> },
  { path: '*', element: <NotFoundPage /> },
], {
  future: {
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
});
