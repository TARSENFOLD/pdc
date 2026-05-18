import { useState, useRef } from 'react';
import { Upload, CheckCircle, XCircle } from 'lucide-react';
import { Spinner } from '@/components/ui';
import { toast } from '@/hooks/useToast';
import { mediaApi } from '@/lib/api/media';
import type { MediaEntityType } from '@pdc/shared';

interface Props {
  onSuccess: (url: string) => void;
  accept?: string;
  maxSizeMB?: number;
  entityType?: MediaEntityType;
}

export function SovereignMediaUpload({ onSuccess, accept = 'image/*', maxSizeMB = 5, entityType = 'generic' }: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Ficheiro excede o limite de ${String(maxSizeMB)}MB`);
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(false);

    try {
      setProgress(30);
      const uploaded = await mediaApi.upload(file, entityType);
      setProgress(80);
      
      setProgress(100);
      setSuccess(true);
      onSuccess(uploaded.url);
      toast({ title: 'Mídia Materializada' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(msg);
      toast({ title: 'Falha no Upload', description: msg, variant: 'error' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <input 
        type="file" 
        accept={accept} 
        onChange={(e) => { void handleFileSelect(e); }} 
        ref={fileInputRef} 
        className="hidden" 
      />
      
      {!isUploading && !success && (
        <button 
          type="button" 
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/20 rounded-xl bg-recessed/50 hover:bg-recessed transition-colors group cursor-pointer"
        >
          <Upload size={24} className="text-ink-tertiary group-hover:text-accent transition-colors mb-2" />
          <span className="text-xs font-bold text-ink-secondary">Clica para fazer upload</span>
          <span className="text-[10px] text-ink-tertiary mt-1">Máx: {String(maxSizeMB)}MB</span>
        </button>
      )}

      {isUploading && (
        <div className="w-full flex flex-col items-center justify-center p-6 border border-white/10 rounded-xl bg-recessed/50">
          <Spinner size="sm" className="mb-3" />
          <span className="text-xs font-bold text-accent">A materializar na Cloud... {progress}%</span>
          <div className="w-full h-1 bg-white/10 rounded-full mt-3 overflow-hidden">
             <div className="h-full bg-accent transition-all duration-300" style={{ width: `${String(progress)}%` }} />
          </div>
        </div>
      )}

      {success && !isUploading && (
        <div className="w-full flex items-center gap-3 p-4 border border-emerald-500/20 rounded-xl bg-emerald-500/5">
          <CheckCircle size={20} className="text-emerald-500" />
          <span className="text-xs font-bold text-emerald-500">Mídia materializada com sucesso</span>
          <button type="button" onClick={() => { setSuccess(false); }} className="ml-auto text-[10px] underline text-ink-tertiary">Substituir</button>
        </div>
      )}

      {error && !isUploading && (
        <div className="w-full flex items-center gap-3 p-4 border border-error/20 rounded-xl bg-error/5 mt-2">
          <XCircle size={16} className="text-error" />
          <span className="text-xs text-error">{error}</span>
        </div>
      )}
    </div>
  );
}
