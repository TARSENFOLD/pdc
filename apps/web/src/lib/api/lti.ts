import { http } from './http';
import type { LtiPlataforma, CreateLtiPlataformaPayload } from '@pdc/shared';

interface StrapiLtiPlataforma {
  id: string;
  attributes: LtiPlataforma;
}

export const ltiApi = {
  getPlataformas: () => 
    http.get<{ data: StrapiLtiPlataforma[] }>('/admin/lti-plataformas').then(res => 
      res.data.map((p) => ({ id: p.id, ...p.attributes }))
    ),

  createPlataforma: (body: CreateLtiPlataformaPayload) =>
    http.post<{ data: StrapiLtiPlataforma }>('/admin/lti-plataformas', body),

  updatePlataforma: (id: string, body: Partial<CreateLtiPlataformaPayload>) =>
    http.put<{ data: StrapiLtiPlataforma }>(`/admin/lti-plataformas/${id}`, body),

  deletePlataforma: (id: string) =>
    http.delete(`/admin/lti-plataformas/${id}`),
};
