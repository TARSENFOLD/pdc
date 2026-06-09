import { z } from 'zod';
import {
  EnderecoAngolaSchema,
  EstadoInstituicaoSchema,
  IdentidadeInstituicaoSchema,
} from './instituicoes-base.js';
import {
  ContactosInstituicaoSchema,
  MultimediaInstituicaoSchema,
  OfertaInstituicaoSchema,
  QualidadeInstituicaoSchema,
  RecursosInstituicaoSchema,
} from './instituicoes-seccoes.js';

export const InstituicaoPrivadaSchema = z.object({
  id: z.string(),
  slug: z.string(),
  estado: EstadoInstituicaoSchema,
  verificada: z.boolean(),
  identidade: IdentidadeInstituicaoSchema,
  localizacao: EnderecoAngolaSchema.optional(),
  contactos: ContactosInstituicaoSchema.optional(),
  oferta: OfertaInstituicaoSchema.optional(),
  recursos: RecursosInstituicaoSchema.optional(),
  qualidade: QualidadeInstituicaoSchema.optional(),
  multimedia: MultimediaInstituicaoSchema.optional(),
  completude: z.number().min(0).max(100),
});

export const InstituicaoPublicaDetalhadaSchema = InstituicaoPrivadaSchema.omit({
  identidade: true,
}).extend({
  nome: z.string(),
  nomeLegal: z.never().optional(),
  nif: z.never().optional(),
  representante: z.never().optional(),
  documentos: z.never().optional(),
  tipo: IdentidadeInstituicaoSchema.shape.tipo,
  natureza: IdentidadeInstituicaoSchema.shape.natureza,
  descricao: z.string().optional(),
  selos: z.array(z.string()),
});

export const SubmeterVerificacaoInstituicaoSchema = z.object({
  confirmacao: z.literal(true),
});

export type InstituicaoPrivada = z.infer<typeof InstituicaoPrivadaSchema>;
export type InstituicaoPublicaDetalhada = z.infer<typeof InstituicaoPublicaDetalhadaSchema>;
