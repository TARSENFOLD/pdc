import { useState } from 'react';
import { PerfilShowcase } from './PerfilShowcase';
import { ProfilePhotoUpload } from './ProfilePhotoUpload';
import { Button, Modal, Input, Spinner } from '@/components/ui';
import { Settings, PenBox, Save, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { perfisApi } from '@/lib/api/perfis';
import { toast } from '@/hooks/useToast';
import type { UpdatePerfilPayload } from '@pdc/shared';

export function PerfilPage() {
  const [isEditing, setIsEditing] = useState(false);
  const qc = useQueryClient();

  const { data: perfil, isLoading } = useQuery({
    queryKey: ['perfis', 'me'],
    queryFn: () => perfisApi.getMe(),
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdatePerfilPayload) => perfisApi.update(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['perfis', 'me'] });
      void qc.invalidateQueries({ queryKey: ['perfil', 'publico'] });
      toast({ title: 'Perfil atualizado com sucesso!' });
      setIsEditing(false);
    },
  });

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-3 px-4">
        <Button 
          variant="secondary" 
          size="sm" 
          className="bg-white/5 border-white/10 hover:bg-white/10"
          onClick={() => { setIsEditing(true); }}
        >
          <PenBox size={16} className="mr-2" /> Editar Perfil
        </Button>
        <Button variant="ghost" size="sm" onClick={() => { window.location.href = '/app/configuracoes'; }}>
          <Settings size={16} />
        </Button>
      </div>

      <PerfilShowcase />

      <Modal open={isEditing} onOpenChange={setIsEditing} title="Editar O Meu Perfil">
        <div className="border-b border-white/5 mb-4">
          <ProfilePhotoUpload currentUrl={perfil?.avatarUrl} />
        </div>
        <form 
          className="space-y-4 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            updateMutation.mutate(Object.fromEntries(formData) as any);
          }}
        >
          <Input name="nome" label="Nome Completo" defaultValue={perfil?.nome} />
          <Input name="bio" label="Bio" defaultValue={perfil?.bio ?? ''} />
          <Input name="regiao" label="Localização" defaultValue={perfil?.regiao ?? ''} />          <div className="flex justify-end gap-3 pt-6">
            <Button type="button" variant="ghost" onClick={() => { setIsEditing(false); }}>
              <X size={16} className="mr-2" /> Cancelar
            </Button>
            <Button type="submit" isLoading={updateMutation.isPending}>
              <Save size={16} className="mr-2" /> Guardar Alterações
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
