import React, { useRef, useState } from 'react';
import type { MediaEntityType } from '@pdc/shared';
import { mediaApi } from '@/lib/api/media';

interface BuilderUploadZoneProps {
  /**
   * Chamado com URLs de blob após seleção.
   * O componente gere a revogação destas URLs automaticamente apenas ao desmontar.
   */
  onUploadComplete: (urls: string[]) => void;
  multiple?: boolean;
  entityType?: MediaEntityType;
}

export default function BuilderUploadZone({ onUploadComplete, multiple, entityType = 'generic' }: BuilderUploadZoneProps): React.ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setIsUploading(true);
      setError(null);
      void Promise.all(Array.from(files).map((file) => mediaApi.upload(file, entityType)))
        .then((results) => {
          onUploadComplete(results.map((result) => result.url));
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Falha no upload');
        })
        .finally(() => {
          setIsUploading(false);
        });
    }
    // Reset input to allow re-selecting the same file
    event.target.value = '';
  };

  return (
    <div 
      role="button"
      tabIndex={0}
      className="rounded-sm border-2 border-dashed p-10 text-center transition-all hover:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent outline-none disabled:opacity-60"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label="Zona de carregamento de ficheiros"
      aria-busy={isUploading}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        multiple={multiple} 
        onChange={handleFileChange}
      />
      <p className="text-sm text-ink-tertiary">
        {isUploading ? 'A carregar...' : `Clique para carregar ficheiros ${multiple ? '(múltiplos)' : ''}`}
      </p>
      {error && <p className="mt-2 text-xs text-accent-danger">{error}</p>}
    </div>
  );
}
