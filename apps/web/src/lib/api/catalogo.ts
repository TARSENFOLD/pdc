import { http } from './http';
import {
  CursoPublico, SimulacaoPublica, ExperienciaPublica,
  MentorPublico, InstituicaoPublicaDetalhada, PerfilCompleto,
  ExplorarResultado, CatalogoMeta, ExplorarItemTipo, AreaVocacional, PerfilPublicoBasico, Role,
} from '@pdc/shared';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type CatalogoResponse<T> = { data: T[]; meta: CatalogoMeta };
type DetailResponse<T> = { data: T };

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

// ─── Filters ──────────────────────────────────────────────────────────────────

interface BaseFilters { page?: number; pageSize?: number; search?: string; area?: string }
interface CursoFiltersPublic extends BaseFilters { nivel?: string; gratuito?: boolean }
interface SimulacaoFiltersPublic extends BaseFilters { tipo?: string; nivel?: string }
interface ExperienciaFiltersPublic extends BaseFilters { nivel?: string; modalidade?: string }
interface InstituicaoFiltersPublic extends BaseFilters { tipo?: string; regiao?: string }
interface ExplorarParams extends Omit<BaseFilters, 'area'> { tipo?: ExplorarItemTipo; area?: AreaVocacional }
interface PessoaFiltersPublic extends BaseFilters { role?: Extract<Role, 'estudante' | 'mentor'> }

// ─── API ──────────────────────────────────────────────────────────────────────

export const catalogoApi = {
  getCursos: (f?: CursoFiltersPublic) =>
    http.get<CatalogoResponse<CursoPublico>>(`/catalogo/cursos${qs({ ...f })}`),

  getCurso: (slug: string) =>
    http.get<DetailResponse<CursoPublico>>(`/catalogo/cursos/${slug}`).then((r) => r.data),

  getSimulacoes: (f?: SimulacaoFiltersPublic) =>
    http.get<CatalogoResponse<SimulacaoPublica>>(`/catalogo/simulacoes${qs({ ...f })}`),

  getExperiencias: (f?: ExperienciaFiltersPublic) => {
    const { pageSize, ...rest } = f ?? {};
    return http.get<CatalogoResponse<ExperienciaPublica>>(`/catalogo/experiencias${qs({ ...rest, limit: pageSize })}`);
  },

  getExperienciasRecomendadas: () =>
    http.get<{ data: Array<{ id: string; titulo: string; tipo: string; matchPercentagem: number; motivo: string }> }>('/catalogo/experiencias/recomendacoes'),

  getSimulacao: (slug: string) =>
    http.get<DetailResponse<SimulacaoPublica>>(`/catalogo/simulacoes/${slug}`).then((r) => r.data),

  getMentores: (f?: BaseFilters) =>
    http.get<CatalogoResponse<MentorPublico>>(`/catalogo/mentores${qs({ ...f })}`),

  getMentor: (id: string) =>
    http.get<DetailResponse<MentorPublico>>(`/catalogo/mentores/${id}`).then((r) => r.data),

  getInstituicoes: (f?: InstituicaoFiltersPublic) =>
    http.get<CatalogoResponse<InstituicaoPublicaDetalhada>>(`/catalogo/instituicoes${qs({ ...f })}`),

  getInstituicao: (slug: string) =>
    http.get<DetailResponse<InstituicaoPublicaDetalhada>>(`/catalogo/instituicoes/${slug}`).then((r) => r.data),

  getPessoas: (f?: PessoaFiltersPublic) => {
    const { pageSize, ...rest } = f ?? {};
    return http.get<CatalogoResponse<PerfilPublicoBasico & { area?: string }>>(`/catalogo/pessoas${qs({ ...rest, limit: pageSize })}`);
  },

  getPerfilPublico: (id: string) =>
    http.get<DetailResponse<PerfilCompleto>>(`/catalogo/perfil/${id}`).then((r) => r.data),

  explorar: (p?: ExplorarParams) =>
    http.get<ExplorarResultado>(`/catalogo/explorar${qs({ ...p })}`),
};
