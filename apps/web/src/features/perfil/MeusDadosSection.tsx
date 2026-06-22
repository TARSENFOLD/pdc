import { useState } from 'react';
import { Download, Loader2, ShieldAlert, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { ApiError, getErrorBody, http } from '@/lib/api/http';
import { Button } from '@/components/ui';
import { toast } from '@/hooks/useToast';

interface DataRightsDeleteResult {
  anonymized: true;
  perfilId?: string;
  revokedVinculos: number;
}

interface VocationalDeleteResult {
  deletedSnapshots: number;
}

interface RevokeAccessesResult {
  revokedVinculos: number;
}

function fileNameForExport(): string {
  const day = new Date().toISOString().slice(0, 10);
  return `pdc-dados-${day}.json`;
}

function downloadJson(data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileNameForExport();
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function errorMessage(error: unknown, fallback: string): string {
  const body = getErrorBody(error);
  if (body?.error) return body.error;
  if (error instanceof ApiError) return fallback;
  return fallback;
}

export function MeusDadosSection(): React.JSX.Element {
  const { logout } = useAuth();
  const [confirmacao, setConfirmacao] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isDeletingVocational, setIsDeletingVocational] = useState(false);
  const [isRevokingAccesses, setIsRevokingAccesses] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleExport(): Promise<void> {
    setIsExporting(true);
    try {
      const data = await http.get<unknown>('/data-rights/export');
      downloadJson(data);
      toast({ title: 'Exportação preparada' });
    } catch (err) {
      toast({ title: errorMessage(err, 'Não foi possível exportar os teus dados'), variant: 'error' });
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDelete(): Promise<void> {
    setIsDeleting(true);
    try {
      await http.post<DataRightsDeleteResult>('/data-rights/delete-account', { confirmacao });
      toast({ title: 'Conta anonimizada' });
      await logout();
      window.location.assign('/login');
    } catch (err) {
      toast({ title: errorMessage(err, 'Não foi possível apagar a conta'), variant: 'error' });
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleDeleteVocational(): Promise<void> {
    setIsDeletingVocational(true);
    try {
      const result = await http.post<VocationalDeleteResult>('/data-rights/delete-vocacional', {});
      toast({ title: `${String(result.deletedSnapshots)} snapshot(s) vocacional(is) removido(s)` });
    } catch (err) {
      toast({ title: errorMessage(err, 'Não foi possível apagar o perfil vocacional'), variant: 'error' });
    } finally {
      setIsDeletingVocational(false);
    }
  }

  async function handleRevokeAccesses(): Promise<void> {
    setIsRevokingAccesses(true);
    try {
      const result = await http.post<RevokeAccessesResult>('/data-rights/revoke-accesses', {});
      toast({ title: `${String(result.revokedVinculos)} vínculo(s) revogado(s)` });
    } catch (err) {
      toast({ title: errorMessage(err, 'Não foi possível revogar acessos'), variant: 'error' });
    } finally {
      setIsRevokingAccesses(false);
    }
  }

  const canDelete = confirmacao === 'APAGAR' && !isDeleting;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold tracking-tight text-ink-primary">Os meus dados</h3>
        <p className="mt-1 text-sm text-ink-secondary">
          Exporta os dados associados à tua conta ou solicita a anonimização irreversível da conta.
        </p>
      </div>

      <section className="rounded-2xl border border-white/5 bg-recessed p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="font-bold text-ink-primary">Exportar dados</h4>
            <p className="mt-1 text-sm text-ink-secondary">
              Recebe um ficheiro JSON com perfil, consentimentos, vínculos, partilhas e snapshots vocacionais.
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={() => { void handleExport(); }} disabled={isExporting}>
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Exportar
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-white/5 bg-recessed p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <h4 className="font-bold text-ink-primary">Perfil vocacional</h4>
            <p className="text-sm text-ink-secondary">
              Remove os snapshots vocacionais atuais. Um novo relatório pode ser gerado depois.
            </p>
            <Button type="button" variant="secondary" onClick={() => { void handleDeleteVocational(); }} disabled={isDeletingVocational}>
              {isDeletingVocational ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Apagar relatório
            </Button>
          </div>
          <div className="space-y-3">
            <h4 className="font-bold text-ink-primary">Acessos e vínculos</h4>
            <p className="text-sm text-ink-secondary">
              Revoga vínculos ativos com mentores e instituições sem apagar a conta.
            </p>
            <Button type="button" variant="secondary" onClick={() => { void handleRevokeAccesses(); }} disabled={isRevokingAccesses}>
              {isRevokingAccesses ? <Loader2 size={16} className="animate-spin" /> : <ShieldAlert size={16} />}
              Revogar acessos
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 shrink-0 text-red-300" size={20} />
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-red-100">Apagar conta</h4>
              <p className="mt-1 text-sm text-ink-secondary">
                A conta é bloqueada, dados pessoais são anonimizados, vínculos são revogados e logs de auditoria ficam retidos por obrigação legal.
              </p>
            </div>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-red-100">Escreve APAGAR para confirmar</span>
              <input
                value={confirmacao}
                onChange={(event) => { setConfirmacao(event.target.value); }}
                className="w-full rounded-xl border border-white/10 bg-canvas px-4 py-3 text-sm font-semibold text-ink-primary outline-none transition focus:border-red-300"
                autoComplete="off"
              />
            </label>
            <Button
              type="button"
              variant="danger"
              onClick={() => { void handleDelete(); }}
              disabled={!canDelete}
            >
              {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Apagar conta
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
