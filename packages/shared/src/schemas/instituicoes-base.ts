import { z } from 'zod';

export const ProvinciasAngolaSchema = z.enum([
  'Bengo',
  'Benguela',
  'Bié',
  'Cabinda',
  'Cuando',
  'Cubango',
  'Cuanza Norte',
  'Cuanza Sul',
  'Cunene',
  'Huambo',
  'Huíla',
  'Icolo e Bengo',
  'Luanda',
  'Lunda Norte',
  'Lunda Sul',
  'Malanje',
  'Moxico',
  'Moxico Leste',
  'Namibe',
  'Uíge',
  'Zaire',
]);

export const EstadoInstituicaoSchema = z.enum([
  'draft',
  'pending_review',
  'changes_requested',
  'verified',
  'suspended',
]);

export const TipoInstituicaoSchema = z.enum([
  'universidade',
  'escola',
  'instituto',
  'centro_formacao',
  'empresa',
  'ong',
  'laboratorio',
  'outro',
]);

export const NaturezaJuridicaSchema = z.enum([
  'publica',
  'privada',
  'mista',
  'associacao',
  'fundacao',
  'cooperativa',
  'outra',
]);

export const IdentidadeInstituicaoSchema = z.object({
  nome: z.string().trim().min(2).max(160),
  nomeLegal: z.string().trim().min(2).max(200),
  sigla: z.string().trim().max(30).optional(),
  tipo: TipoInstituicaoSchema,
  natureza: NaturezaJuridicaSchema,
  // Verificação básica de formato; confirmação oficial depende de documento/AGT.
  nif: z.string().trim().regex(/^[A-Z0-9][A-Z0-9./-]{4,29}$/).optional(),
  descricao: z.string().trim().max(3000).optional(),
  anoFundacao: z.number().int().min(1800).max(2100).optional(),
});

export const EnderecoAngolaSchema = z.object({
  pais: z.literal('AO').default('AO'),
  provincia: ProvinciasAngolaSchema,
  municipio: z.string().trim().min(2).max(100),
  comuna: z.string().trim().max(100).optional(),
  localidade: z.string().trim().max(140).optional(),
  rua: z.string().trim().max(180).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  requerConfirmacaoTerritorial: z.boolean().default(false),
});

export type EstadoInstituicao = z.infer<typeof EstadoInstituicaoSchema>;
export type IdentidadeInstituicao = z.infer<typeof IdentidadeInstituicaoSchema>;
export type EnderecoAngola = z.infer<typeof EnderecoAngolaSchema>;
