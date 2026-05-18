export const ONBOARDING_VIDEO_ROLES = [
  'estudante',
  'mentor',
  'instituicao',
  'moderador',
  'comite_cientifico',
  'super_admin',
  'patrocinador',
] as const;

export type OnboardingVideoRole = (typeof ONBOARDING_VIDEO_ROLES)[number];

export const ONBOARDING_VIDEO_TITLES: Record<OnboardingVideoRole, { pt: string; en: string }> = {
  estudante: { pt: 'Bem-vindo, Estudante', en: 'Welcome, Student' },
  mentor: { pt: 'Bem-vindo, Mentor', en: 'Welcome, Mentor' },
  instituicao: { pt: 'Bem-vinda, Instituição', en: 'Welcome, Institution' },
  moderador: { pt: 'Bem-vindo, Moderador', en: 'Welcome, Moderator' },
  comite_cientifico: { pt: 'Bem-vindo, Comité Científico', en: 'Welcome, Scientific Committee' },
  super_admin: { pt: 'Bem-vindo, Administrador', en: 'Welcome, Administrator' },
  patrocinador: { pt: 'Bem-vindo, Patrocinador', en: 'Welcome, Sponsor' },
};
