import { UploadResultSchema, type MediaEntityType, type UploadResult } from '@pdc/shared';
import { http } from './http';

export const mediaApi = {
  upload: async (file: File, entityType: MediaEntityType = 'generic'): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', entityType);

    return http.postFormParsed('/media/upload', formData, UploadResultSchema);
  },
};
