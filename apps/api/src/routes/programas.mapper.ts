import type { CriarProgramaPayload, Programa } from '@pdc/shared';

type ProgramaRelation = { id: string | number };

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
    ...(cursosIds === undefined ? {} : { cursos: cursosIds }),
    ...(experienciasIds === undefined ? {} : { experiencias: experienciasIds }),
    ...(simulacoesIds === undefined ? {} : { simulacoes: simulacoesIds }),
    ...(projetosIds === undefined ? {} : { projetos: projetosIds }),
    ...(instituicaoId === undefined ? {} : { instituicao: instituicaoId }),
    ...(responsavelId === undefined ? {} : { responsavel: responsavelId }),
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
    instituicaoId: programa.instituicao ? String(programa.instituicao.id) : undefined,
    responsavelId: programa.responsavel ? String(programa.responsavel.id) : undefined,
  };
}

function relationIds(relations: ProgramaRelation[] | undefined): string[] {
  return relations?.map((relation) => String(relation.id)) ?? [];
}
