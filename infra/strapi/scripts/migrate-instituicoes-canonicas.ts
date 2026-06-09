import type { Core } from '@strapi/strapi';

interface PerfilLegado {
  id: number;
  documentId?: string;
  userId?: string;
  nome?: string;
  regiao?: string;
  natureza?: string;
  tipoInstituicao?: string;
  documentos?: unknown[];
  avatarUrl?: string;
  bannerUrl?: string;
  instituicaoGerida?: { id: number } | null;
}

function slugify(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

type TipoCanonico = 'universidade' | 'instituto' | 'escola' | 'centro_formacao' | 'empresa' | 'ong' | 'laboratorio' | 'outro';

function tipoCanonico(value: string | undefined): TipoCanonico {
  const allowed = ['universidade', 'instituto', 'escola', 'centro_formacao', 'empresa', 'ong', 'laboratorio'] as const;
  return allowed.find(item => item === value) ?? 'outro';
}

function naturezaCanonica(value: string | undefined) {
  if (value === 'publica' || value === 'privada' || value === 'mista') return value;
  return undefined;
}

function documentosJson(value: unknown[] | undefined): string[] {
  return (value ?? []).map(item => {
    if (typeof item === 'string') return item;
    if (item !== null && typeof item === 'object') return JSON.stringify(item);
    return String(item);
  });
}

export async function migrateInstituicoesCanonicas(strapi: Core.Strapi): Promise<void> {
  const pageSize = 100;
  let start = 0;
  let migrated = 0;
  let skipped = 0;
  let failed = 0;
  while (true) {
    const perfis = await strapi.documents('api::perfil.perfil').findMany({
      filters: { tipo: 'instituicao' },
      populate: ['instituicaoGerida'],
      limit: pageSize,
      start,
    }) as unknown as PerfilLegado[];
    if (perfis.length === 0) break;
    for (const perfil of perfis) {
      if (perfil.instituicaoGerida) {
        skipped++;
        continue;
      }
      let createdDocumentId: string | undefined;
      try {
        const nome = perfil.nome?.trim() || `Instituição ${perfil.userId ?? String(perfil.id)}`;
        const legacyCuandoCubango = perfil.regiao === 'Cuando Cubango';
        const created = await strapi.documents('api::instituicao.instituicao').create({
          data: {
            nome,
            nomeLegal: nome,
            slug: `${slugify(nome)}-${String(perfil.id)}`,
            tipo: tipoCanonico(perfil.tipoInstituicao),
            natureza: naturezaCanonica(perfil.natureza),
            regiao: perfil.regiao,
            estado: 'draft',
            aprovada: false,
            enderecoEstruturado: legacyCuandoCubango ? {
              pais: 'AO', provincia: 'Cuando', municipio: 'Por confirmar',
              requerConfirmacaoTerritorial: true,
            } : undefined,
            branding: {
              logoUrl: perfil.avatarUrl, capaUrl: perfil.bannerUrl,
              migrationSource: 'perfil-legado',
              legacyDocumentos: documentosJson(perfil.documentos),
            },
          },
        });
        createdDocumentId = created.documentId;
        await strapi.documents('api::perfil.perfil').update({
          documentId: perfil.documentId ?? String(perfil.id),
          data: { instituicaoGerida: created.id },
        });
        migrated++;
      } catch (error) {
        failed++;
        if (createdDocumentId) {
          try {
            await strapi.documents('api::instituicao.instituicao').delete({ documentId: createdDocumentId });
          } catch (rollbackError) {
            const rollbackMessage = rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
            strapi.log.error(`[instituicao-migration] rollback=${createdDocumentId} error=${rollbackMessage}`);
          }
        }
        const message = error instanceof Error ? error.message : String(error);
        strapi.log.error(`[instituicao-migration] perfil=${String(perfil.id)} error=${message}`);
      }
    }
    start += perfis.length;
    if (perfis.length < pageSize) break;
  }
  strapi.log.info(`[instituicao-migration] migrated=${String(migrated)} skipped=${String(skipped)} failed=${String(failed)}`);
}

export default migrateInstituicoesCanonicas;
