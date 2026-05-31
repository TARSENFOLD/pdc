import { UploadResultSchema, type MediaEntityType, type UploadResult } from '@pdc/shared';

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

export const mediaApi = {
  upload: async (file: File, entityType: MediaEntityType = 'generic'): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', entityType);

    const response = await fetch(`${BASE_URL}/media/upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const body: unknown = await response.json().catch(() => ({}));
      const errorMessage =
        body && typeof body === 'object' && 'error' in body && typeof (body as Record<string, unknown>).error === 'string'
          ? (body as { error: string }).error
          : `Upload failed: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    const data: unknown = await response.json();
    const result = UploadResultSchema.safeParse(data);
    if (!result.success) {
      throw new Error(`Invalid response format from server: ${result.error.message}`);
    }
    return result.data;
  },
};
