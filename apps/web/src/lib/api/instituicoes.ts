import type {
  ContactosInstituicaoSchema,
  EnderecoAngolaSchema,
  IdentidadeInstituicaoSchema,
  InstituicaoPrivada,
  MultimediaInstituicaoSchema,
  OfertaInstituicaoSchema,
  QualidadeInstituicaoSchema,
  RecursosInstituicaoSchema,
} from '@pdc/shared';
import type { z } from 'zod';
import { http } from './http';

type SectionPayloads = {
  identidade: z.infer<typeof IdentidadeInstituicaoSchema>;
  localizacao: z.infer<typeof EnderecoAngolaSchema>;
  contactos: z.infer<typeof ContactosInstituicaoSchema>;
  oferta: z.infer<typeof OfertaInstituicaoSchema>;
  recursos: z.infer<typeof RecursosInstituicaoSchema>;
  qualidade: z.infer<typeof QualidadeInstituicaoSchema>;
  multimedia: z.infer<typeof MultimediaInstituicaoSchema>;
};

export type InstituicaoEditor = InstituicaoPrivada & { documentos?: Array<{ nome: string; tipo: string; estadoAnalise: string }> };

export const instituicoesApi = {
  getMe: () => http.get<{ data: InstituicaoEditor }>('/instituicoes/me').then(result => result.data),
  save<K extends keyof SectionPayloads>(section: K, payload: SectionPayloads[K]) {
    return http.patch<{ data: InstituicaoEditor }>(`/instituicoes/me/${section}`, payload).then(result => result.data);
  },
  addDocumento(file: File, tipo: string) {
    const body = new FormData();
    body.append('file', file);
    body.append('tipo', tipo);
    return http.postForm<{ data: InstituicaoEditor }>('/instituicoes/me/documentos', body).then(result => result.data);
  },
  submeter: () => http.post<{ data: InstituicaoEditor }>('/instituicoes/me/submeter-verificacao', { confirmacao: true }).then(result => result.data),
};
