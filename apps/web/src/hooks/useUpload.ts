import { useState } from 'react';

interface UploadResult {
  url: string;
  key: string;
  tamanhoBytes: number;
  mimeType: string;
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

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${import.meta.env.VITE_API_URL || '/api'}/media/upload`);

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
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } else {
            const err = JSON.parse(xhr.responseText);
            setError(err.error || 'Falha no upload');
            reject(new Error(err.error));
          }
        };

        xhr.onerror = () => {
          setError('Erro de rede ao fazer upload');
          reject(new Error('Network error'));
        };

        xhr.send(formData);
      });
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { upload, isUploading, progress, error };
}
