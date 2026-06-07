import { useState } from 'react';
import { UploadResultSchema, type UploadResult } from '@pdc/shared';

function parseJson(text: string): unknown {
  return JSON.parse(text) as unknown;
}

function getUploadErrorMessage(value: unknown): string {
  if (typeof value === 'object' && value !== null && 'error' in value) {
    const err = value as { error?: unknown };
    if (typeof err.error === 'string') return err.error;
  }
  return 'Falha no upload';
}

export function useUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File): Promise<UploadResult | null> => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      return await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const apiUrl = typeof import.meta.env.VITE_API_URL === 'string'
          ? import.meta.env.VITE_API_URL
          : import.meta.env.PROD
            ? 'https://api.usepdc.com'
            : '/api';
        xhr.open('POST', `${apiUrl}/media/upload`);
        xhr.withCredentials = true;

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const parsed = UploadResultSchema.safeParse(parseJson(xhr.responseText));
            if (parsed.success) {
              resolve(parsed.data);
              return;
            }
            reject(new Error('Resposta inválida do servidor de upload'));
          } else {
            const err = xhr.responseText ? parseJson(xhr.responseText) : null;
            const message = getUploadErrorMessage(err);
            setError(message);
            reject(new Error(message));
          }
        };

        xhr.onerror = () => {
          setError('Erro de rede ao fazer upload');
          reject(new Error('Network error'));
        };

        xhr.send(formData);
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { upload, isUploading, progress, error };
}
