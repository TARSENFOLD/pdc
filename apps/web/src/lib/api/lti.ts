import { apiClient } from './http.js';
import type { LtiPlataforma, CreateLtiPlataformaPayload } from '@pdc/shared';

interface StrapiLtiPlataforma {
  id: string;
  attributes: LtiPlataforma;
}

export const ltiApi = {
  getPlataformas: () => 
    apiClient.get<{ data: StrapiLtiPlataforma[] }>('/admin/lti-plataformas').then(res => 
      res.data.map((p) => ({ id: p.id, ...p.attributes }))
    ),

  createPlataforma: (body: CreateLtiPlataformaPayload) =>
    apiClient.post<{ data: StrapiLtiPlataforma }>('/admin/lti-plataformas', body),

  updatePlataforma: (id: string, body: Partial<CreateLtiPlataformaPayload>) =>
    apiClient.put<{ data: StrapiLtiPlataforma }>(`/admin/lti-plataformas/${id}`, body),

  deletePlataforma: (id: string) =>
    apiClient.delete(`/admin/lti-plataformas/${id}`),
};
