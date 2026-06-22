import { z } from 'zod';

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAJORITY_AGE = 18;

export const LEGAL_DOCUMENT_CURRENT_VERSIONS = {
  termosUso: 'termos-uso@2026-06-22',
  politicaPrivacidade: 'politica-privacidade@2026-06-22',
  tratamentoDados: 'tratamento-dados@2026-06-22',
} as const;

export const VOCACIONAL_MODEL_VERSION = 'pdc-vocacional@2026-06-22';
export const VOCACIONAL_HEURISTICS_VERSION = 'heuristics-calculator@2026-06-22';
export const VOCACIONAL_EXPLANATION_VERSION = 'explainability@2026-06-22';

export const LegalDocumentKindSchema = z.enum([
  'termos_uso',
  'politica_privacidade',
  'tratamento_dados',
  'politica_cookies',
  'transparencia_ia',
  'dpa',
]);
export type LegalDocumentKind = z.infer<typeof LegalDocumentKindSchema>;

export const LegalDocumentPublicSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  slug: z.string().min(1),
  tipo: LegalDocumentKindSchema,
  titulo: z.string().min(1),
  versao: z.string().min(1),
  resumo: z.string().optional(),
  conteudo: z.string().min(1),
  effectiveAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type LegalDocumentPublic = z.infer<typeof LegalDocumentPublicSchema>;

export const ConsentPurposeSchema = z.enum([
  'termos_uso',
  'politica_privacidade',
  'tratamento_dados',
  'cookies_analiticos',
  'transparencia_ia',
  'partilha_institucional',
  'encarregado_educacao',
]);
export type ConsentPurpose = z.infer<typeof ConsentPurposeSchema>;

export const ConsentTypeSchema = z.enum([
  'termos',
  'privacidade',
  'perfil_vocacional',
  'marketing',
  'partilha_instituicao',
]);
export type ConsentType = z.infer<typeof ConsentTypeSchema>;

export const ConsentStatusSchema = z.enum(['pendente', 'aceite', 'recusado', 'revogado']);
export type ConsentStatus = z.infer<typeof ConsentStatusSchema>;

export const ConsentimentoEstadoSchema = z.enum([
  'pendente',
  'completo',
  'requer_reconsentimento',
  'bloqueado',
]);
export type ConsentimentoEstado = z.infer<typeof ConsentimentoEstadoSchema>;

export const EstadoMenoridadeSchema = z.enum(['pendente', 'adulto', 'menor']);
export type EstadoMenoridade = z.infer<typeof EstadoMenoridadeSchema>;

export const DataNascimentoSchema = z.string()
  .regex(DATE_ONLY_RE, 'dataNascimento deve usar o formato YYYY-MM-DD')
  .refine(isValidDateOnly, 'dataNascimento inválida');

export const ConsentRecordSchema = z.object({
  tipo: ConsentTypeSchema,
  versao: z.string().min(1),
  concedido: z.boolean(),
  at: z.string().datetime(),
  ipHash: z.string().optional(),
});
export type ConsentRecord = z.infer<typeof ConsentRecordSchema>;

export const ConsentStateSchema = z.record(ConsentTypeSchema, ConsentRecordSchema.optional()).default({});
export type ConsentState = z.infer<typeof ConsentStateSchema>;

export const AceiteLegalSchema = z.object({
  termosUso: z.literal(true),
  politicaPrivacidade: z.literal(true),
  tratamentoDados: z.literal(true),
  termosUsoVersao: z.string().min(1).default(LEGAL_DOCUMENT_CURRENT_VERSIONS.termosUso),
  politicaPrivacidadeVersao: z.string().min(1).default(LEGAL_DOCUMENT_CURRENT_VERSIONS.politicaPrivacidade),
  tratamentoDadosVersao: z.string().min(1).default(LEGAL_DOCUMENT_CURRENT_VERSIONS.tratamentoDados),
  aceiteEm: z.string().datetime().optional(),
});
export type AceiteLegal = z.infer<typeof AceiteLegalSchema>;

export const ConsentimentoEncarregadoSchema = z.object({
  nome: z.string().min(3),
  email: z.string().email(),
  parentesco: z.enum(['mae', 'pai', 'tutor_legal', 'outro']),
  aceite: z.literal(true),
});
export type ConsentimentoEncarregado = z.infer<typeof ConsentimentoEncarregadoSchema>;

export const LegalComplianceCompletionSchema = z.object({
  dataNascimento: DataNascimentoSchema,
  aceiteLegal: AceiteLegalSchema,
  consentimentoEncarregado: ConsentimentoEncarregadoSchema.optional(),
}).superRefine((payload, ctx) => {
  if (resolveEstadoMenoridade(payload.dataNascimento) === 'menor' && !payload.consentimentoEncarregado) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['consentimentoEncarregado'],
      message: 'Consentimento do encarregado é obrigatório para menores.',
    });
  }
});
export type LegalComplianceCompletion = z.infer<typeof LegalComplianceCompletionSchema>;

export const AiProfileVersionSchema = z.object({
  modelVersion: z.string().min(1).default(VOCACIONAL_MODEL_VERSION),
  heuristicsVersion: z.string().min(1).default(VOCACIONAL_HEURISTICS_VERSION),
  explanationVersion: z.string().min(1).default(VOCACIONAL_EXPLANATION_VERSION),
  generatedWithAiSupport: z.boolean().default(false),
  calculationMethod: z.enum(['heuristico_deterministico', 'ia_assistida']).default('heuristico_deterministico'),
});
export type AiProfileVersion = z.infer<typeof AiProfileVersionSchema>;

export function isValidDateOnly(value: string): boolean {
  if (!DATE_ONLY_RE.test(value)) return false;
  const [yearRaw, monthRaw, dayRaw] = value.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

export function calculateAge(dataNascimento: string, at: Date = new Date()): number | null {
  if (!isValidDateOnly(dataNascimento)) return null;
  const [yearRaw, monthRaw, dayRaw] = dataNascimento.split('-');
  const birthYear = Number(yearRaw);
  const birthMonth = Number(monthRaw);
  const birthDay = Number(dayRaw);
  let age = at.getUTCFullYear() - birthYear;
  const currentMonth = at.getUTCMonth() + 1;
  const currentDay = at.getUTCDate();
  if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) {
    age -= 1;
  }
  return age;
}

export function resolveEstadoMenoridade(dataNascimento?: string, at: Date = new Date()): EstadoMenoridade {
  if (!dataNascimento) return 'pendente';
  const age = calculateAge(dataNascimento, at);
  if (age === null) return 'pendente';
  return age < MAJORITY_AGE ? 'menor' : 'adulto';
}

export function computeIsMinor(dataNascimento: string, now: Date = new Date()): boolean {
  return resolveEstadoMenoridade(dataNascimento, now) === 'menor';
}
