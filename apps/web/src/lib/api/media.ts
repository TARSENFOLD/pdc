import { UploadResultSchema, type UploadResult } from '@pdc/shared';

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

export const mediaApi = {
  upload: async (file: File): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${BASE_URL}/media/upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? `Upload falhou: ${response.statusText}`);
    }

    const data: unknown = await response.json();
    return UploadResultSchema.parse(data);
  },
};
