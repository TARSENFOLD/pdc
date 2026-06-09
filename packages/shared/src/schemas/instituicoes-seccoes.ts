import { z } from 'zod';

const UrlSchema = z.string().url().max(500);

export const ContactoInstitucionalSchema = z.object({
  tipo: z.enum(['email', 'telefone', 'whatsapp']),
  valor: z.string().trim().min(3).max(160),
  departamento: z.string().trim().max(100).optional(),
  publico: z.boolean().default(false),
});

export const ContactosInstituicaoSchema = z.object({
  contactos: z.array(ContactoInstitucionalSchema).min(1).max(20),
  website: UrlSchema.optional(),
  horarioAtendimento: z.string().trim().max(500).optional(),
});

export const OfertaInstituicaoSchema = z.object({
  niveisEnsino: z.array(z.enum([
    'iniciacao', 'primario', 'secundario_I_ciclo', 'secundario_II_ciclo',
    'tecnico_profissional', 'graduacao', 'pos_graduacao', 'formacao_profissional',
  ])).max(8),
  areasAtividade: z.array(z.string().trim().min(2).max(100)).max(30),
  servicos: z.array(z.string().trim().min(2).max(120)).max(30),
});

export const RecursosInstituicaoSchema = z.object({
  numeroEstudantes: z.number().int().nonnegative().optional(),
  numeroDocentes: z.number().int().nonnegative().optional(),
  numeroColaboradores: z.number().int().nonnegative().optional(),
  infraestruturas: z.array(z.string().trim().min(2).max(120)).max(40),
  acessibilidade: z.array(z.string().trim().min(2).max(120)).max(20),
});

export const AcreditacaoInstituicaoSchema = z.object({
  nome: z.string().trim().min(2).max(180),
  entidade: z.string().trim().min(2).max(180),
  fonte: UrlSchema.optional(),
  validaAte: z.string().date().optional(),
});

export const QualidadeInstituicaoSchema = z.object({
  acreditacoes: z.array(AcreditacaoInstituicaoSchema).max(30),
  certificacoes: z.array(AcreditacaoInstituicaoSchema).max(30),
  politicas: z.array(z.object({
    titulo: z.string().trim().min(2).max(160),
    url: UrlSchema,
  })).max(20),
});

export const MultimediaInstituicaoSchema = z.object({
  logoUrl: UrlSchema.optional(),
  capaUrl: UrlSchema.optional(),
  galeriaUrls: z.array(UrlSchema).max(30),
  videoUrl: UrlSchema.optional(),
  redesSociais: z.record(z.string().trim().min(1).max(40), UrlSchema),
});

export const DocumentoLegalInstituicaoSchema = z.object({
  id: z.string().min(1).optional(),
  tipo: z.enum(['nif', 'alvara', 'estatuto', 'acreditacao', 'representacao', 'outro']),
  nome: z.string().trim().min(1).max(180),
  storageKey: z.string().min(1).max(500),
  mimeType: z.string().min(3).max(120),
  tamanho: z.number().int().positive(),
  estadoAnalise: z.enum(['pending', 'approved', 'rejected']).default('pending'),
});
