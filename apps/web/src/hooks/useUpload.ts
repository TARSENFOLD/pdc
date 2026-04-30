import { useState } from 'react';

interface UploadResult {
  url: string;
  key: string;
  tamanhoBytes: number;
  mimeType: string;
}

interface UploadErrorResponse {
  error?: string;
}

function isUploadResult(value: unknown): value is UploadResult {
  if (typeof value !== 'object' || value === null) return false;
  return (
    'url' in value && typeof value.url === 'string' &&
    'key' in value && typeof value.key === 'string' &&
    'tamanhoBytes' in value && typeof value.tamanhoBytes === 'number' &&
    'mimeType' in value && typeof value.mimeType === 'string'
  );
}

function parseJson(text: string): unknown {
  return JSON.parse(text) as unknown;
}

function getUploadErrorMessage(value: unknown): string {
  if (typeof value === 'object' && value !== null && 'error' in value) {
    const response = value as UploadErrorResponse;
    if (typeof response.error === 'string') return response.error;
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

      // Usando fetch nativo para capturar progresso se necessário, 
      // ou apenas o http helper se preferirmos simplicidade E2E.
      // Para o Patamar Mundial, implementamos com XHR para progresso real.

      return await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const apiUrl = typeof import.meta.env.VITE_API_URL === 'string' ? import.meta.env.VITE_API_URL : '/api';
        xhr.open('POST', `${apiUrl}/media/upload`);

        // Autenticação (buscamos o token do cookie ou localStorage se necessário, 
        // mas o middleware verifyJwt espera o token nos cookies por padrão no nosso boilerplate)
        xhr.withCredentials = true;

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const response = parseJson(xhr.responseText);
            if (isUploadResult(response)) {
              resolve(response);
              return;
            }
            reject(new Error('Resposta inválida do servidor de upload'));
          } else {
            const err = parseJson(xhr.responseText);
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
