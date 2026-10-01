import type { AreaVocacional } from '@pdc/shared';

// ─── Constantes canónicas (Spec 04) ──────────────────────────────────────────

export const AREAS: Array<{ value: AreaVocacional; label: string }> = [
  { value: 'SAUDE', label: 'Saúde' },
  { value: 'ENGENHARIA', label: 'Engenharia' },
  { value: 'TECNOLOGIA', label: 'Tecnologia' },
  { value: 'DIREITO', label: 'Direito' },
  { value: 'GESTAO', label: 'Gestão' },
  { value: 'EDUCACAO', label: 'Educação' },
  { value: 'ARTES', label: 'Artes' },
  { value: 'CIENCIAS_AGRARIAS', label: 'Ciências Agrárias' },
  { value: 'CIENCIAS_SOCIAIS', label: 'Ciências Sociais' },
  { value: 'COMUNICACAO', label: 'Comunicação' },
  { value: 'CIENCIAS_NATURAIS', label: 'Ciências Naturais' },
  { value: 'ARQUITETURA', label: 'Arquitetura' },
  { value: 'TURISMO_HOTELARIA', label: 'Turismo e Hotelaria' },
  { value: 'DESPORTO', label: 'Desporto' },
  { value: 'OUTRA', label: 'Outra' },
];

export const MODALIDADES = [
  { value: '', label: 'Todas as modalidades' },
  { value: 'presencial', label: 'Presencial' },
  { value: 'online', label: 'Online' },
  { value: 'hibrido', label: 'Híbrido' },
];

export const NIVEIS = [
  { value: '', label: 'Todos os níveis' },
  { value: 'basico', label: 'Básico' },
  { value: 'medio', label: 'Médio' },
  { value: 'avancado', label: 'Avançado' },
];
