import { z } from 'zod';
import {
  CriarExperienciaPayloadSchema,
  ExperienciaSecaoSchema,
  ExperienciaItemSchema,
  PainelRealidadeSchema,
  EmpregadorSchema,
  MuralVozesItemSchema,
  GuiaInstitucionalSchema,
} from '@pdc/shared';
import { experienceDefaults } from './experience-defaults';

const draftEmployer = EmpregadorSchema.extend({
  nome: z.string(),
  setor: z.string().optional(),
  url: z.string().optional(),
  logoUrl: z.string().optional(),
});
const draftReality = PainelRealidadeSchema.extend({
  principaisEmpregadores: z
    .array(
      z
        .union([z.string(), draftEmployer])
        .transform((value) => (typeof value === 'string' ? { nome: value } : value))
    )
    .optional(),
});
// Local recovery validates structure, not publication readiness. Empty fields and
// partially typed URLs must survive a refresh; the form resolver still validates saving.
const draftSchema = CriarExperienciaPayloadSchema.extend({
  titulo: z.string(),
  descricao: z.string(),
  capaUrl: z.string().optional(),
  duracaoEstimada: z
    .number()
    .nullable()
    .optional()
    .transform((value) => value ?? undefined),
  painelRealidade: draftReality.optional(),
  muralVozes: z.array(MuralVozesItemSchema.extend({ videoUrl: z.string().optional() })).optional(),
  guiaInstitucional: GuiaInstitucionalSchema.extend({
    fotosCampus: z.array(z.string()).optional(),
  }).optional(),
  secoes: z.array(
    ExperienciaSecaoSchema.extend({
      titulo: z.string(),
      itens: z.array(
        ExperienciaItemSchema.extend({
          titulo: z.string(),
          mediaUrl: z.string().optional(),
          arquivoUrl: z.string().optional(),
          cta: z.object({ label: z.string(), url: z.string() }).optional(),
        })
      ),
    })
  ),
});

export function recoverExperienceDraft(serialized: string, vwx: boolean) {
  const candidate = z
    .object({
      tipoExperiencia: z.enum(['institucional', 'vwx']).optional(),
      painelRealidade: z.unknown().optional(),
    })
    .passthrough()
    .parse(JSON.parse(serialized));
  const type = vwx ? 'vwx' : 'institucional';
  if (candidate.tipoExperiencia && candidate.tipoExperiencia !== type)
    throw new Error('Tipo de rascunho incompatível.');
  return draftSchema.parse({
    ...experienceDefaults(vwx),
    ...candidate,
    tipoExperiencia: type,
  });
}
