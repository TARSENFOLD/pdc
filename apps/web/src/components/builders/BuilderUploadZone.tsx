import React, { useRef, useEffect } from 'react';

interface BuilderUploadZoneProps {
  /**
   * Chamado com URLs de blob após seleção.
   * O componente gere a revogação destas URLs automaticamente apenas ao desmontar.
   */
  onUploadComplete: (urls: string[]) => void;
  multiple?: boolean;
}

export default function BuilderUploadZone({ onUploadComplete, multiple }: BuilderUploadZoneProps): React.ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generatedUrlsRef = useRef<string[]>([]);

  // Cleanup: Revogar URLs de blob ao desmontar para evitar leaks de memória
  useEffect(() => {
    return () => {
      generatedUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

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
      const urls = Array.from(files).map(file => URL.createObjectURL(file));
      generatedUrlsRef.current = [...generatedUrlsRef.current, ...urls];
      onUploadComplete(urls);
    }
    // Reset input to allow re-selecting the same file
    event.target.value = '';
  };

  return (
    <div 
      role="button"
      tabIndex={0}
      className="p-10 border-2 border-dashed rounded-3xl text-center cursor-pointer hover:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent outline-none transition-all" 
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label="Zona de carregamento de ficheiros"
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        multiple={multiple} 
        onChange={handleFileChange}
      />
      <p className="text-sm text-ink-tertiary">
        Clique para carregar ficheiros {multiple ? '(múltiplos)' : ''}
      </p>
    </div>
  );
}
