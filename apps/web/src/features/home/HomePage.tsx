import { useAuth } from '@/lib/auth/AuthContext';
import { Link } from 'react-router-dom';
import { Card, Badge, Spinner } from '@/components/ui';
import {
  BookOpen, FlaskConical, Trophy, Star, Zap,
  PenSquare, Users, Shield, Building2, Microscope,
  BarChart3, ChevronRight,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { Role } from '@pdc/shared';

interface QuickAction {
  label: string;
  to: string;
  icon: React.ElementType;
  description: string;
}

const ACTIONS_BY_ROLE: Record<Role, QuickAction[]> = {
  estudante: [
    { label: 'Simulações', to: '/app/simulacoes', icon: FlaskConical, description: 'Testa as tuas competências em cenários reais' },
    { label: 'Cursos', to: '/app/cursos', icon: BookOpen, description: 'Aprende com conteúdo validado por mentores' },
    { label: 'Perfil Vocacional', to: '/app/perfil-vocacional', icon: Star, description: 'Descobre a tua área de maior afinidade' },
    { label: 'Ranking', to: '/app/ranking', icon: Trophy, description: 'Vê a tua posição no mérito global' },
  ],
  mentor: [
    { label: 'Os Meus Cursos', to: '/app/mentor/cursos', icon: BookOpen, description: 'Gere e cria conteúdo educativo' },
    { label: 'Criar Curso', to: '/app/mentor/cursos/criar', icon: PenSquare, description: 'Inicia um novo curso no Course Builder' },
    { label: 'Simulações', to: '/app/mentor/simulacoes', icon: FlaskConical, description: 'Cria e gere laboratórios práticos' },
    { label: 'Mentorados', to: '/app/mentor/mentorados', icon: Users, description: 'Acompanha os teus estudantes' },
  ],
  instituicao: [
    { label: 'Experiências', to: '/app/instituicao/experiencias', icon: Building2, description: 'Gere as vitrinas curriculares' },
    { label: 'Programas', to: '/app/instituicao/programas', icon: BookOpen, description: 'Cria roteiros educativos' },
    { label: 'Estudantes', to: '/app/instituicao/estudantes-vinculados', icon: Users, description: 'Vê estudantes vinculados' },
    { label: 'Relatórios', to: '/app/instituicao/relatorios', icon: BarChart3, description: 'Analisa o impacto institucional' },
  ],
  moderador: [
    { label: 'Fila de Aprovações', to: '/app/moderacao/aprovacoes', icon: Shield, description: 'Revê conteúdo pendente de moderação' },
    { label: 'Denúncias', to: '/app/moderacao/denuncias', icon: Shield, description: 'Trata denúncias da comunidade' },
    { label: 'Utilizadores', to: '/app/moderador/utilizadores', icon: Users, description: 'Gere utilizadores da plataforma' },
    { label: 'Estatísticas', to: '/app/admin/stats', icon: BarChart3, description: 'Painel de métricas do ecossistema' },
  ],
  comite_cientifico: [
    { label: 'Validação Científica', to: '/app/comite/validacao', icon: Microscope, description: 'Valida conteúdo por rigor académico' },
    { label: 'Dashboard Comité', to: '/app/comite', icon: BarChart3, description: 'Visão geral do comité' },
    { label: 'Feed', to: '/app/feed', icon: Zap, description: 'Vê o que se passa na comunidade' },
  ],
  super_admin: [
    { label: 'Estatísticas', to: '/app/admin/stats', icon: BarChart3, description: 'Visão 360° do ecossistema' },
    { label: 'Utilizadores', to: '/app/admin/utilizadores', icon: Users, description: 'Gere todos os utilizadores' },
    { label: 'Feature Flags', to: '/app/admin/feature-flags', icon: Shield, description: 'Controla features e rollouts' },
    { label: 'Feed Weights', to: '/app/admin/feed-weights', icon: Zap, description: 'Tuna o algoritmo de ranking' },
  ],
  patrocinador: [
    { label: 'Feed', to: '/app/feed', icon: Zap, description: 'Vê o que se passa na comunidade' },
    { label: 'Explorar', to: '/app/explorar', icon: Building2, description: 'Descobre conteúdo e talentos' },
  ],
};

const GREETING_BY_ROLE: Record<Role, string> = {
  estudante: 'O teu percurso começa aqui',
  mentor: 'Estúdio de Criação',
  instituicao: 'Painel Institucional',
  moderador: 'Centro de Operações',
  comite_cientifico: 'Laboratório de Validação',
  super_admin: 'Controlo Soberano',
  patrocinador: 'Painel do Patrocinador',
};

export default function HomePage(): React.ReactNode {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas">
        <Spinner size="lg" />
      </div>
    );
  }

  const role = user?.role ?? 'estudante';
  const actions = ACTIONS_BY_ROLE[role];
  const greeting = GREETING_BY_ROLE[role];

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-20 animate-in fade-in duration-1000">
      <header className="space-y-3 px-4">
        <Badge variant="info" className="bg-accent/10 text-accent border-accent/20 px-3 py-1 uppercase tracking-widest text-[9px] font-black">
          {role.replace('_', ' ')}
        </Badge>
        <h1 className="text-4xl font-black text-ink-primary tracking-tighter font-display">
          {user?.nome ? `Olá, ${String(user.nome.split(' ')[0])}` : 'Bem-vindo'}
        </h1>
        <p className="text-ink-secondary text-sm leading-relaxed max-w-lg">
          {greeting}. Escolhe por onde queres começar.
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-4">
        {actions.map((action, idx) => (
          <motion.div
            key={action.to}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08, type: 'spring', stiffness: 260, damping: 24 }}
          >
            <Link to={action.to}>
              <Card interactive className="h-full p-6 flex flex-col gap-4 border-white/5 bg-elevated/50 hover:border-accent/30 transition-all group">
                <div className="p-3 rounded-2xl bg-accent/5 text-accent w-fit group-hover:scale-110 transition-transform">
                  <action.icon size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-ink-primary group-hover:text-accent transition-colors">{action.label}</h3>
                  <p className="text-xs text-ink-tertiary mt-1 leading-relaxed">{action.description}</p>
                </div>
                <div className="flex items-center text-[10px] font-black text-ink-tertiary uppercase tracking-widest group-hover:text-accent transition-colors">
                  Abrir <ChevronRight size={12} className="ml-1" />
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </section>

      <section className="px-4">
        <Card className="p-8 border-white/5 bg-recessed/30 text-center">
          <Zap size={32} className="mx-auto text-accent/30 mb-4" />
          <p className="text-[10px] font-black text-ink-tertiary uppercase tracking-[0.3em]">
            Infraestrutura de decisão educacional soberana
          </p>
          <p className="text-xs text-ink-tertiary mt-2">
            O Oráculo observa o teu percurso e adapta recomendações em tempo real.
          </p>
        </Card>
      </section>
    </div>
  );
}
