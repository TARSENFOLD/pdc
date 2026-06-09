export interface StrapiInstituicao {
  id: string | number;
  documentId?: string;
  slug?: string;
  nome: string;
  nomeLegal?: string;
  sigla?: string;
  tipo?: string;
  natureza?: string;
  nif?: string;
  descricao?: string;
  anoFundacao?: number;
  estado?: string;
  enderecoEstruturado?: unknown;
  contactosInstitucionais?: unknown[];
  website?: string;
  niveisEnsino?: unknown;
  areasAtividade?: unknown;
  servicos?: unknown;
  estatisticas?: Record<string, unknown>;
  infraestruturas?: unknown;
  acessibilidade?: unknown;
  acreditacoes?: unknown[];
  politicas?: unknown[];
  redesSociais?: Record<string, string>;
  logoUrl?: string;
  capaUrl?: string;
  galeriaUrls?: string[];
  videoUrl?: string;
  documentosLegais?: unknown[];
}

export interface StrapiPerfilGestor {
  id: string | number;
  documentId?: string;
  userId?: string;
  instituicaoGerida?: StrapiInstituicao | null;
}

export function persistedId(entity: { id: string | number; documentId?: string }): string {
  return entity.documentId ?? String(entity.id);
}
