import type { ComponentType } from 'react';
import type { Role, NavItemSlug } from '@pdc/shared';
import {
  LayoutDashboard, Rss, BookOpen, FlaskConical, Trophy,
  GraduationCap, Award, Link2,
  Shield, CheckCircle,
  Settings, BookOpenText, PenSquare,
  MapPin, Star, Microscope, ScrollText,
  Brain, Zap, Building2, BarChart3,
  type LucideProps,
} from 'lucide-react';

export type LucideIcon = ComponentType<LucideProps>;

export interface NavLeaf {
  type: 'leaf';
  slug: NavItemSlug;
  to: string;
  icon: LucideIcon;
  roles: Role[];
  domain?: string;
}

export interface NavGroup {
  type: 'group';
  slug: NavItemSlug;
  icon: LucideIcon;
  roles: Role[];
  children: NavLeaf[];
  domain?: string;
}

export type SidebarItem = NavLeaf | NavGroup;

export const ALL_ROLES: Role[] = [
  'estudante', 'mentor', 'instituicao', 'moderador', 'comite_cientifico', 'super_admin', 'patrocinador',
];

export const DASHBOARD_BY_ROLE: Record<Role, string> = {
  estudante: '/app/dashboard/estudante',
  mentor: '/app/dashboard/mentor',
  instituicao: '/app/dashboard/instituicao',
  moderador: '/app/dashboard/moderador',
  comite_cientifico: '/app/dashboard/comite',
  super_admin: '/app/dashboard/admin',
  patrocinador: '/app/dashboard/patrocinador',
};

export const SIDEBAR_CONFIG: SidebarItem[] = [
  { type: 'leaf', slug: 'inicio', to: '/app/home', icon: LayoutDashboard, roles: ALL_ROLES },
  { type: 'leaf', slug: 'meu_dashboard', to: '/app/dashboard', icon: BarChart3, roles: ALL_ROLES },
  {
    type: 'group', slug: 'aprender', icon: BookOpenText, roles: ['estudante'], domain: 'HUB_LEARN',
    children: [
      { type: 'leaf', slug: 'simulacoes', to: '/app/simulacoes', icon: FlaskConical, roles: ['estudante'] },
      { type: 'leaf', slug: 'cursos', to: '/app/cursos', icon: BookOpen, roles: ['estudante'] },
      { type: 'leaf', slug: 'meus_cursos', to: '/app/meus-cursos', icon: CheckCircle, roles: ['estudante'] },
    ],
  },
  {
    type: 'group', slug: 'explorar', icon: Building2, roles: ['estudante'], domain: 'HUB_EXPLORE',
    children: [
      { type: 'leaf', slug: 'experiencias', to: '/app/experiencias', icon: MapPin, roles: ['estudante'] },
      { type: 'leaf', slug: 'programas', to: '/app/programas', icon: GraduationCap, roles: ['estudante'] },
      { type: 'leaf', slug: 'catalogo', to: '/app/explorar', icon: ScrollText, roles: ['estudante'] },
    ],
  },
  {
    type: 'group', slug: 'meu_futuro', icon: Star, roles: ['estudante'], domain: 'HUB_FUTURE',
    children: [
      { type: 'leaf', slug: 'relatorio_vocacional', to: '/app/perfil-vocacional', icon: Brain, roles: ['estudante'] },
      { type: 'leaf', slug: 'reputacao', to: '/app/reputacao', icon: Star, roles: ['estudante'] },
      { type: 'leaf', slug: 'certificados', to: '/app/certificados', icon: Award, roles: ['estudante'] },
    ],
  },
  {
    type: 'group', slug: 'comunidade', icon: Rss, roles: ALL_ROLES, domain: 'HUB_COMMUNITY',
    children: [
      { type: 'leaf', slug: 'feed', to: '/app/feed', icon: Zap, roles: ALL_ROLES },
      { type: 'leaf', slug: 'ranking', to: '/app/ranking', icon: Trophy, roles: ALL_ROLES },
      { type: 'leaf', slug: 'vinculos', to: '/app/vinculos', icon: Link2, roles: ALL_ROLES },
    ],
  },
  {
    type: 'group', slug: 'estudio_mentor', icon: PenSquare, roles: ['mentor'], domain: 'HUB_MENTOR',
    children: [
      { type: 'leaf', slug: 'gestao_cursos', to: '/app/mentor/cursos', icon: BookOpen, roles: ['mentor'] },
      { type: 'leaf', slug: 'laboratorios', to: '/app/mentor/simulacoes', icon: FlaskConical, roles: ['mentor'] },
    ],
  },
  {
    type: 'group', slug: 'gestao_institucional', icon: Building2, roles: ['instituicao'], domain: 'HUB_INSTITUTION',
    children: [
      { type: 'leaf', slug: 'vitrinas_curriculares', to: '/app/instituicao/experiencias', icon: MapPin, roles: ['instituicao'] },
      { type: 'leaf', slug: 'roteiros', to: '/app/instituicao/programas', icon: GraduationCap, roles: ['instituicao'] },
    ],
  },
  {
    type: 'group', slug: 'autoridade', icon: Shield, roles: ['moderador', 'super_admin', 'comite_cientifico'],
    children: [
      { type: 'leaf', slug: 'auditoria_cientifica', to: '/app/comite/validacao', icon: Microscope, roles: ['comite_cientifico', 'super_admin'] },
      { type: 'leaf', slug: 'fila_aprovacoes', to: '/app/moderacao/aprovacoes', icon: CheckCircle, roles: ['moderador', 'super_admin'] },
      { type: 'leaf', slug: 'painel_admin', to: '/app/admin/stats', icon: Settings, roles: ['super_admin'] },
    ],
  },
];
