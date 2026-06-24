import type { LegalDocumentPublic } from '@pdc/shared';
import { http } from './http';

export const legalApi = {
  getBySlug: (slug: string) => http.get<LegalDocumentPublic>(`/legal/${encodeURIComponent(slug)}`),
};
