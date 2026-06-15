import type { CriarProgramaPayload, Programa } from '@pdc/shared';

type ProgramaRelation = { id: string | number; documentId?: string };

export interface StrapiProgramaRecord {
  id: string | number;
  documentId?: string;
  titulo: string;
  estado: string;
  perfilId?: string;
  instituicaoId?: string;
  responsavel?: { id: string | number; documentId?: string };
  instituicao?: { id: string | number; documentId?: string; nome?: string; logoUrl?: string };
  cursos?: ProgramaRelation[];
  experiencias?: ProgramaRelation[];
  simulacoes?: ProgramaRelation[];
  projetos?: ProgramaRelation[];
  historicoEstados?: Array<{ estado: string; timestamp: string; autorId: string }>;
  metadata?: unknown;
  [key: string]: unknown;
}

export function toStrapiPrograma(
  payload: Partial<{
    [Key in keyof CriarProgramaPayload]: CriarProgramaPayload[Key] | undefined;
  }>,
): Record<string, unknown> {
  const {
    cursosIds,
    experienciasIds,
    simulacoesIds,
    projetosIds,
    instituicaoId,
    responsavelId,
    ...fields
  } = payload;

  return {
    ...fields,
    ...(cursosIds != null ? { cursos: cursosIds } : {}),
    ...(experienciasIds != null ? { experiencias: experienciasIds } : {}),
    ...(simulacoesIds != null ? { simulacoes: simulacoesIds } : {}),
    ...(projetosIds != null ? { projetos: projetosIds } : {}),
    ...(instituicaoId != null ? { instituicao: instituicaoId } : {}),
    ...(responsavelId != null ? { responsavel: responsavelId } : {}),
  };
}

export function fromStrapiPrograma<T extends StrapiProgramaRecord>(
  programa: T,
): T & Pick<
  Programa,
  'cursosIds' | 'experienciasIds' | 'simulacoesIds' | 'projetosIds' | 'instituicaoId' | 'responsavelId'
> {
  return {
    ...programa,
    cursosIds: relationIds(programa.cursos),
    experienciasIds: relationIds(programa.experiencias),
    simulacoesIds: relationIds(programa.simulacoes),
    projetosIds: relationIds(programa.projetos),
    instituicaoId: relationId(programa.instituicao),
    responsavelId: relationId(programa.responsavel),
  };
}

function relationIds(relations: ProgramaRelation[] | undefined): string[] {
  return relations?.map((relation) => relationId(relation)).filter((id): id is string => id !== undefined) ?? [];
}

function relationId(relation: ProgramaRelation | undefined): string | undefined {
  return relation?.documentId ?? (relation?.id !== undefined ? String(relation.id) : undefined);
}
