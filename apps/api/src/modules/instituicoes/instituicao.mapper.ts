import type {
  ContactosInstituicaoSchema,
  EnderecoAngolaSchema,
  MultimediaInstituicaoSchema,
  OfertaInstituicaoSchema,
  QualidadeInstituicaoSchema,
  RecursosInstituicaoSchema,
} from '@pdc/shared';
import type { z } from 'zod';
import type { StrapiInstituicao } from './instituicao.types.js';

type Localizacao = z.infer<typeof EnderecoAngolaSchema>;
type Contactos = z.infer<typeof ContactosInstituicaoSchema>;
type Oferta = z.infer<typeof OfertaInstituicaoSchema>;
type Recursos = z.infer<typeof RecursosInstituicaoSchema>;
type Qualidade = z.infer<typeof QualidadeInstituicaoSchema>;
type Multimedia = z.infer<typeof MultimediaInstituicaoSchema>;

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function completude(d: StrapiInstituicao): number {
  const checks = [
    Boolean(d.nome && d.nomeLegal && d.tipo && d.natureza && d.nif),
    Boolean(d.enderecoEstruturado),
    Boolean(d.contactosInstitucionais?.length),
    Boolean(list(d.niveisEnsino).length || list(d.areasAtividade).length),
    Boolean(list(d.infraestruturas).length),
    Boolean(d.acreditacoes?.length || d.politicas?.length),
    Boolean(d.logoUrl || d.capaUrl),
    Boolean(d.documentosLegais?.length),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function mapPrivada(d: StrapiInstituicao) {
  const estado = d.estado ?? 'draft';
  return {
    id: String(d.id),
    slug: d.slug ?? String(d.id),
    estado,
    verificada: estado === 'verified',
    identidade: {
      nome: d.nome,
      nomeLegal: d.nomeLegal ?? d.nome,
      ...(d.sigla ? { sigla: d.sigla } : {}),
      tipo: d.tipo ?? 'outro',
      natureza: d.natureza ?? 'outra',
      ...(d.nif ? { nif: d.nif } : {}),
      ...(d.descricao ? { descricao: d.descricao } : {}),
      ...(d.anoFundacao ? { anoFundacao: d.anoFundacao } : {}),
    },
    ...(d.enderecoEstruturado ? { localizacao: d.enderecoEstruturado as Localizacao } : {}),
    ...(d.contactosInstitucionais?.length ? {
      contactos: {
        contactos: d.contactosInstitucionais,
        ...(d.website ? { website: d.website } : {}),
      } as Contactos,
    } : {}),
    oferta: {
      niveisEnsino: list(d.niveisEnsino),
      areasAtividade: list(d.areasAtividade),
      servicos: list(d.servicos),
    } as Oferta,
    recursos: {
      ...(d.estatisticas ?? {}),
      infraestruturas: list(d.infraestruturas),
      acessibilidade: list(d.acessibilidade),
    } as Recursos,
    qualidade: {
      acreditacoes: (d.acreditacoes ?? []).filter(ac => (ac as { categoria?: string }).categoria !== 'certificacao'),
      certificacoes: (d.acreditacoes ?? []).filter(ac => (ac as { categoria?: string }).categoria === 'certificacao'),
      politicas: d.politicas ?? [],
    } as Qualidade,
    multimedia: {
      ...(d.logoUrl ? { logoUrl: d.logoUrl } : {}),
      ...(d.capaUrl ? { capaUrl: d.capaUrl } : {}),
      galeriaUrls: d.galeriaUrls ?? [],
      ...(d.videoUrl ? { videoUrl: d.videoUrl } : {}),
      redesSociais: d.redesSociais ?? {},
    } as Multimedia,
    documentos: d.documentosLegais ?? [],
    completude: completude(d),
  };
}

export function mapPublica(d: StrapiInstituicao) {
  const privada = mapPrivada(d);
  const publicContactos = privada.contactos?.contactos.filter(item => item.publico) ?? [];
  return {
    id: privada.id,
    slug: privada.slug,
    nome: privada.identidade.nome,
    tipo: privada.identidade.tipo,
    natureza: privada.identidade.natureza,
    descricao: privada.identidade.descricao,
    estado: privada.estado,
    verificada: privada.verificada,
    selos: privada.verificada ? ['verificada'] : [],
    localizacao: privada.localizacao,
    ...(publicContactos.length ? {
      contactos: {
        contactos: publicContactos,
        ...(privada.contactos?.website ? { website: privada.contactos.website } : {}),
      },
    } : {}),
    oferta: privada.oferta,
    recursos: privada.recursos,
    qualidade: privada.qualidade,
    multimedia: privada.multimedia,
    completude: privada.completude,
  };
}
