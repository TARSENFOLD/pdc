import * as React from 'react';
import { ltiApi } from '@/lib/api/lti';
import { Button } from '@/components/ui/Button';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/hooks/useToast';
import type { LtiPlataforma, CreateLtiPlataformaPayload } from '@pdc/shared';

export default function LtiPlataformasPage() {
  const [plataformas, setPlataformas] = React.useState<LtiPlataforma[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingPlataforma, setEditingPlataforma] = React.useState<LtiPlataforma | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = React.useState<CreateLtiPlataformaPayload>({
    nome: '',
    issuer: '',
    clientId: '',
    deploymentId: '',
    authLoginUrl: '',
    authTokenUrl: '',
    keySetUrl: '',
    ativo: true,
  });

  const loadPlataformas = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await ltiApi.getPlataformas();
      setPlataformas(data);
    } catch {
      toast({ title: 'Erro', description: 'Falha ao carregar plataformas' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    void loadPlataformas();
  }, [loadPlataformas]);

  const handleOpenAdd = () => {
    setEditingPlataforma(null);
    setFormData({
      nome: '',
      issuer: '',
      clientId: '',
      deploymentId: '',
      authLoginUrl: '',
      authTokenUrl: '',
      keySetUrl: '',
      ativo: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: LtiPlataforma) => {
    setEditingPlataforma(p);
    setFormData({
      nome: p.nome,
      issuer: p.issuer,
      clientId: p.clientId,
      deploymentId: p.deploymentId,
      authLoginUrl: p.authLoginUrl,
      authTokenUrl: p.authTokenUrl,
      keySetUrl: p.keySetUrl,
      ativo: p.ativo,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem a certeza que deseja eliminar esta plataforma?')) return;
    try {
      await ltiApi.deletePlataforma(id);
      toast({ title: 'Sucesso', description: 'Plataforma eliminada' });
      void loadPlataformas();
    } catch {
      toast({ title: 'Erro', description: 'Falha ao eliminar plataforma' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPlataforma) {
        await ltiApi.updatePlataforma(editingPlataforma.id, formData);
        toast({ title: 'Sucesso', description: 'Plataforma atualizada' });
      } else {
        await ltiApi.createPlataforma(formData);
        toast({ title: 'Sucesso', description: 'Plataforma criada' });
      }
      setIsModalOpen(false);
      void loadPlataformas();
    } catch {
      toast({ title: 'Erro', description: 'Falha ao guardar plataforma' });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Plataformas LTI 1.3</h1>
        <Button onClick={handleOpenAdd}>Adicionar Plataforma</Button>
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center p-8">
            <Spinner />
          </div>
        ) : (
          <Table
            columns={[
              { header: 'Nome', accessor: 'nome' },
              { header: 'Issuer', accessor: 'issuer' },
              { header: 'Client ID', accessor: 'clientId' },
              {
                header: 'Estado',
                accessor: (p) => (
                  <Badge variant={p.ativo ? 'success' : 'outline'}>{p.ativo ? 'Ativo' : 'Inativo'}</Badge>
                ),
              },
              {
                header: 'Ações',
                accessor: (p) => (
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => { handleOpenEdit(p); }}>
                      Editar
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => { void handleDelete(p.id); }}>
                      Eliminar
                    </Button>
                  </div>
                ),
              },
            ]}
            data={plataformas}
          />
        )}
      </Card>

      <Modal
        open={isModalOpen}
        onOpenChange={(v) => {
          if (!v) setIsModalOpen(false);
        }}
        title={editingPlataforma ? 'Editar Plataforma' : 'Adicionar Plataforma'}
      >
        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
          <Input
            label="Nome"
            value={formData.nome}
            onChange={(e) => { setFormData({ ...formData, nome: e.target.value }); }}
            required
          />
          <Input
            label="Issuer"
            value={formData.issuer}
            onChange={(e) => { setFormData({ ...formData, issuer: e.target.value }); }}
            required
            type="url"
          />
          <Input
            label="Client ID"
            value={formData.clientId}
            onChange={(e) => { setFormData({ ...formData, clientId: e.target.value }); }}
            required
          />
          <Input
            label="OIDC Auth Login URL"
            value={formData.authLoginUrl}
            onChange={(e) => { setFormData({ ...formData, authLoginUrl: e.target.value }); }}
            required
            type="url"
          />
          <Input
            label="OIDC Auth Token URL"
            value={formData.authTokenUrl}
            onChange={(e) => { setFormData({ ...formData, authTokenUrl: e.target.value }); }}
            required
            type="url"
          />
          <Input
            label="JWKS Keys Set URL"
            value={formData.keySetUrl}
            onChange={(e) => { setFormData({ ...formData, keySetUrl: e.target.value }); }}
            required
            type="url"
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.ativo}
              onChange={(e) => { setFormData({ ...formData, ativo: e.target.checked }); }}
            />
            <span>Ativo</span>
          </label>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={() => { setIsModalOpen(false); }}>
              Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
