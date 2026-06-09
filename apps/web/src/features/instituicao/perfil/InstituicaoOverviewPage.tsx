import { Link, useOutletContext } from 'react-router-dom';
import { Card, Button } from '@/components/ui';
import type { InstituicaoEditor } from '@/lib/api/instituicoes';

export function InstituicaoOverviewPage() {
  const { instituicao } = useOutletContext<{ instituicao: InstituicaoEditor }>();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card className="p-6 sm:col-span-2">
        <h2 className="text-xl font-bold">Visão geral</h2>
        <p className="mt-2 text-sm text-ink-secondary">
          Completa cada etapa. Identidade, NIF privado, localização, contacto e documentos são necessários para verificação.
        </p>
      </Card>
      <Card className="p-5">
        <p className="text-sm text-ink-tertiary">Estado atual</p>
        <p className="mt-1 text-lg font-bold capitalize">{instituicao.estado.replaceAll('_', ' ')}</p>
      </Card>
      <Card className="p-5">
        <p className="text-sm text-ink-tertiary">Completude</p>
        <p className="mt-1 text-lg font-bold">{instituicao.completude}%</p>
      </Card>
      <div className="sm:col-span-2">
        <Link to="../identidade"><Button>Continuar edição</Button></Link>
      </div>
    </div>
  );
}
