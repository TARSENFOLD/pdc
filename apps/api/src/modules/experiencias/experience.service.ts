import { randomUUID } from 'node:crypto';
import {
  ExperienciaSchema,
  parsePainelRealidade,
  VWX_SECTION_TYPES,
  type CriarExperienciaPayload,
  type Experiencia,
  type VwxValidacaoSchema,
} from '@pdc/shared';
import type { z } from 'zod';
import { strapiGet, strapiPut } from '../strapi/strapi.client.js';
import { persistedEntityId } from '../strapi/strapi-entity.js';
import {
  canReadResolvedPublicContent,
  parseContentState,
} from '../conteudo/content-access.service.js';
import { canExposeExperience, isVwxCatalogEnabled } from '../feature-flags/vwx-catalog-gate.js';

export type ExperienceRecord = Omit<Experiencia, 'id' | 'instituicao' | 'slug' | 'descricao'> & {
  slug: string | null;
  descricao: string | null;
  id: string | number;
  documentId?: string;
  autor?: { id?: string | number; userId?: string };
  instituicao?: { id: string | number; documentId?: string; nome: string; logoUrl?: string } | null;
  vwxValidacao?: z.infer<typeof VwxValidacaoSchema> | null;
};

export async function findExperience(identifier: string, status = 'draft') {
  const res = await strapiGet<ExperienceRecord>('/experiencias', {
    status,
    populate: 'autor,instituicao',
    'filters[$or][0][documentId][$eq]': identifier,
    'filters[$or][1][slug][$eq]': identifier,
    ...(/^\d+$/.test(identifier) ? { 'filters[$or][2][id][$eq]': identifier } : {}),
    'pagination[pageSize]': '1',
  });
  return res.data[0];
}

export async function publicExperience(identifier: string) {
  const [current, published] = await Promise.all([
    findExperience(identifier),
    findExperience(identifier, 'published'),
  ]);
  if (
    !published ||
    !canReadResolvedPublicContent({
      currentState: parseContentState(current?.estado),
      publishedState: parseContentState(published.estado),
      hasPublishedVersion: true,
    }) ||
    !canExposeExperience(published, await isVwxCatalogEnabled())
  )
    return undefined;
  return published;
}

export function experienceDto(value: ExperienceRecord): Experiencia {
  // Zod strips author and partner approval evidence from every public response.
  return ExperienciaSchema.parse({
    ...value,
    id: persistedEntityId(value),
    slug: value.slug || persistedEntityId(value),
    descricao: value.descricao ?? '',
    tipoExperiencia: value.tipoExperiencia ?? 'institucional',
    instituicao: value.instituicao
      ? {
          ...value.instituicao,
          id: persistedEntityId(value.instituicao),
          logoUrl: value.instituicao.logoUrl ?? undefined,
        }
      : undefined,
    dataInicio: value.dataInicio ?? undefined,
    dataFim: value.dataFim ?? undefined,
    painelRealidade: value.painelRealidade
      ? parsePainelRealidade(value.painelRealidade)
      : undefined,
    muralVozes: value.muralVozes ?? undefined,
    guiaInstitucional: value.guiaInstitucional ?? undefined,
    secoes: value.secoes ?? undefined,
    gradeDestaque: value.gradeDestaque ?? undefined,
  });
}

export function publicExperienceDto(value: ExperienceRecord): Experiencia {
  const dto = experienceDto(value);
  return { ...dto, secoes: dto.secoes?.filter((section) => section.visibilidade === 'publico') };
}

export function variantIssues(
  body: Pick<
    CriarExperienciaPayload,
    'tipoExperiencia' | 'vwx' | 'secoes' | 'painelRealidade' | 'muralVozes' | 'guiaInstitucional'
  >
): string[] {
  const vwx = body.tipoExperiencia === 'vwx';
  const issues: string[] = [];
  const professional = new Set<string>(VWX_SECTION_TYPES);
  if (!vwx && body.vwx)
    issues.push('Dados profissionais VWX não pertencem a uma Experiência institucional.');
  if (vwx && (body.painelRealidade || body.muralVozes || body.guiaInstitucional)) {
    issues.push('Painéis institucionais não pertencem à VWX.');
  }
  for (const section of body.secoes) {
    const shared = ['materiais', 'faq', 'personalizado'].includes(section.tipo);
    if (!shared && professional.has(section.tipo) !== vwx)
      issues.push(`Secção incompatível: ${section.titulo}`);
  }
  return issues;
}

export function readinessIssues(value: ExperienceRecord): string[] {
  const sections = value.secoes ?? [];
  const groups: readonly (readonly string[])[] =
    value.tipoExperiencia === 'vwx'
      ? VWX_SECTION_TYPES.map((type) => [type])
      : [
          ['boas_vindas'],
          ['realidade'],
          ['ano_fase', 'curriculo'],
          ['depoimentos'],
          ['infraestrutura'],
          ['proximos_passos'],
        ];
  const issues = groups
    .filter(
      (group) =>
        !sections.some(
          (s) =>
            group.includes(s.tipo) &&
            s.itens.some(
              (item) => item.conteudo?.trim() || item.mediaUrl || item.arquivoUrl || item.cta
            )
        )
    )
    .map((group) => `Completar conteúdo: ${group.join(' / ')}`);
  const hasText = (text: unknown) => typeof text === 'string' && text.trim().length > 0;
  if (![value.titulo, value.descricao].every(hasText)) issues.push('Preencher título e descrição.');
  if (
    value.tipoExperiencia === 'vwx' &&
    ![value.vwx?.profissao, value.vwx?.entidade, value.vwx?.objetivo].every(hasText)
  ) {
    issues.push('Preencher profissão, entidade e objetivo da VWX.');
  }
  return issues;
}

export function newExperienceSlug(title: string) {
  const slug = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug}-${randomUUID().slice(0, 8)}`;
}

export async function publishExperience(existing: ExperienceRecord) {
  const path = `/experiencias/${persistedEntityId(existing)}`;
  // Catalogues use approved + a real published version, matching the course lifecycle.
  await strapiPut(path, { estado: 'approved' }, { status: 'published' });
  await strapiPut(path, { estado: 'published' }, { status: 'draft' });
}
