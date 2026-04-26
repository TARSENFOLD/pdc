import { useState, useRef } from 'react';
import { Camera, Upload, Trash2 } from 'lucide-react';
import { Spinner } from '@/components/ui';
import { mediaApi } from '@/lib/api/media';
import { perfisApi } from '@/lib/api/perfis';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from '@/hooks/useToast';
import { Avatar } from '@/components/ui/Avatar';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  currentUrl?: string | null | undefined;
  onSuccess?: () => void;
}

/**
 * ProfilePhotoUpload (Alma do Produto - Bloco 1)
 * Componente de integridade vertical para gestão de identidade visual.
 */
export function ProfilePhotoUpload({ currentUrl, onSuccess }: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const qc = useQueryClient();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação básica
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Erro no Upload', description: 'A foto deve ter menos de 2MB.', variant: 'error' });
      return;
    }

    setIsUploading(true);
    try {
      // 1. Upload para R2/Strapi
      const uploadRes = await mediaApi.upload(file);
      
      // 2. Atualizar perfil com a nova URL
      // Nota: o mediaApi.upload deve retornar a URL ou o ID do ficheiro.
      // O Strapi v5 prefere o ID do ficheiro no campo 'foto'.
      await perfisApi.update({ avatarUrl: uploadRes.url });

      // 3. Invalidar caches globais para sincronização (The Nervous System)
      await qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      await qc.invalidateQueries({ queryKey: ['perfis', 'me'] });
      
      toast({ title: 'Foto atualizada!', description: 'A tua nova identidade já está visível em toda a plataforma.' });
      onSuccess?.();
    } catch {
      toast({ title: 'Falha no Upload', description: 'Não foi possível carregar a tua foto.', variant: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Tens a certeza que queres remover a tua foto de perfil?')) return;
    
    setIsUploading(true);
    try {
      await perfisApi.update({ avatarUrl: '' });
      await qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      await qc.invalidateQueries({ queryKey: ['perfis', 'me'] });
      toast({ title: 'Foto removida' });
      onSuccess?.();
    } catch {
      toast({ title: 'Erro ao remover', variant: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      <div className="relative group">
        <div className="h-32 w-32 rounded-full border-4 border-accent/20 p-1 shadow-2xl relative overflow-hidden">
          <Avatar 
            src={currentUrl || undefined} 
            alt={user?.nome} 
            tier={user?.reputacaoTier}
            className="h-full w-full rounded-full object-cover text-4xl border-4" 
          />
          {isUploading && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
              <Spinner size="md" className="text-accent" />
            </div>
          )}
        </div>
        
        <button
          type="button"
          onClick={() => { fileInputRef.current?.click(); }}
          disabled={isUploading}
          className="absolute bottom-0 right-0 h-10 w-10 rounded-full bg-accent text-white flex items-center justify-center border-4 border-surface shadow-lg hover:scale-110 transition-transform active:scale-95 disabled:opacity-50"
          title="Mudar Foto"
        >
          <Camera size={18} />
        </button>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { fileInputRef.current?.click(); }}
          disabled={isUploading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-50"
        >
          <Upload size={14} className="text-accent" /> Carregar Foto
        </button>
        
        {currentUrl && (
          <button
            type="button"
            onClick={() => { void handleRemove(); }}
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-error/10 border border-error/20 text-xs font-black uppercase tracking-widest text-error hover:bg-error/20 transition-all disabled:opacity-50"
          >
            <Trash2 size={14} /> Remover
          </button>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUpload}
        accept="image/*"
        className="hidden"
      />
      
      <p className="text-[10px] text-ink-tertiary font-medium max-w-[200px] text-center leading-relaxed">
        Usa uma foto clara. O Oráculo utiliza a tua identidade visual para gerar autoridade no Feed.
      </p>
    </div>
  );
}
