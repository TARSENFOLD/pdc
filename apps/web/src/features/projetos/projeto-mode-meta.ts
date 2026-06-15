import { Banknote, GraduationCap, Layers, MessageCircle, Users } from 'lucide-react';
import type { ProjetoModo } from '@pdc/shared';

export const PROJECT_MODE_CTA: Record<ProjetoModo, { label: string; icon: typeof Users }> = {
  exposicao: { label: 'Projeto em exposição', icon: Layers },
  colaboracao: { label: 'Pedir para Colaborar', icon: Users },
  mentoria: { label: 'Oferecer Mentoria', icon: GraduationCap },
  financiamento: { label: 'Manifestar Interesse', icon: Banknote },
  feedbackComunitario: { label: 'Dar Feedback', icon: MessageCircle },
};

export const PROJECT_MODE_LABELS: Record<ProjetoModo, string> = {
  exposicao: 'Exposição',
  colaboracao: 'Colaboração',
  mentoria: 'Mentoria',
  financiamento: 'Financiamento',
  feedbackComunitario: 'Feedback Comunitário',
};
