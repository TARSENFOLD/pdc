import type { UploadResult } from '@pdc/shared';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export const mediaApi = {
  upload: async (file: File): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${BASE_URL}/media/upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      // Note: Do NOT set Content-Type header manually for FormData, 
      // the browser will set it with the correct boundary.
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  },
};
