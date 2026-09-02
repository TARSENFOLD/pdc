import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { Button, Card, Input } from '@/components/ui';
import { toast } from '@/hooks/useToast';
import {
  institutionKeys,
  instituicoesApi,
  type InstituicaoEditor,
} from '@/lib/api/instituicoes';
import { EnderecoAngolaSchema, OfertaInstituicaoSchema } from '@pdc/shared';

type Section = 'identidade' | 'localizacao-contactos' | 'oferta' | 'recursos' | 'qualidade' | 'multimedia';
type Context = { instituicao: InstituicaoEditor };

function lines(value: string): string[] {
  return value.split('\n').map(item => item.trim()).filter(Boolean);
}

export function InstituicaoSectionPage({ section }: { section: Section }) {
  const { instituicao } = useOutletContext<Context>();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>(() => initialValues(section, instituicao));
  const mutation = useMutation({
    mutationFn: () => saveSection(section, form, instituicao),
    onSuccess: data => {
      queryClient.setQueryData(institutionKeys.me(), data);
      toast({ title: 'Rascunho guardado' });
    },
    onError: () => toast({ title: 'Não foi possível guardar', variant: 'error' }),
  });
  const fields = fieldsFor(section);
  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold text-ink-primary">{titleFor(section)}</h2>
      <p className="mt-1 text-sm text-ink-secondary">Esta etapa é guardada independentemente.</p>
      <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); mutation.mutate(); }}>
        {fields.map(field => field.multiline ? (
          <label key={field.key} className="space-y-1 sm:col-span-2">
            <span className="text-sm font-medium">{field.label}</span>
            <textarea className="min-h-28 w-full rounded-lg border border-[var(--card-border)] bg-canvas p-3 text-sm"
              value={form[field.key] ?? ''} onChange={event => { setForm(current => ({ ...current, [field.key]: event.target.value })); }} />
          </label>
        ) : (
          <Input key={field.key} label={field.label} value={form[field.key] ?? ''}
            onChange={event => { setForm(current => ({ ...current, [field.key]: event.target.value })); }} />
        ))}
        <div className="flex justify-end sm:col-span-2">
          <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'A guardar...' : 'Guardar rascunho'}</Button>
        </div>
      </form>
    </Card>
  );
}

function fieldsFor(section: Section) {
  const map = {
    identidade: [['nome', 'Nome público'], ['nomeLegal', 'Nome legal'], ['sigla', 'Sigla'], ['tipo', 'Tipo'], ['natureza', 'Natureza jurídica'], ['nif', 'NIF privado'], ['descricao', 'Descrição', true]],
    'localizacao-contactos': [['provincia', 'Província'], ['municipio', 'Município'], ['comuna', 'Comuna'], ['rua', 'Rua'], ['email', 'Email institucional'], ['telefone', 'Telefone'], ['website', 'Website']],
    oferta: [['niveisEnsino', 'Níveis de ensino, um por linha', true], ['areasAtividade', 'Áreas de actividade, uma por linha', true], ['servicos', 'Serviços, um por linha', true]],
    recursos: [['numeroEstudantes', 'Número de estudantes'], ['numeroDocentes', 'Número de docentes'], ['infraestruturas', 'Infraestruturas, uma por linha', true], ['acessibilidade', 'Recursos de acessibilidade, um por linha', true]],
    qualidade: [['acreditacoes', 'Acreditações, uma por linha', true], ['certificacoes', 'Certificações, uma por linha', true], ['politicas', 'Políticas: título|URL, uma por linha', true]],
    multimedia: [['logoUrl', 'URL do logotipo'], ['capaUrl', 'URL da capa'], ['videoUrl', 'URL do vídeo'], ['galeriaUrls', 'Galeria, uma URL por linha', true]],
  } as const;
  return map[section].map(([key, label, multiline]) => ({ key, label, multiline: Boolean(multiline) }));
}

function titleFor(section: Section): string {
  return ({ identidade: 'Identidade', 'localizacao-contactos': 'Localização e contactos', oferta: 'Oferta e serviços', recursos: 'Infraestrutura e dimensão', qualidade: 'Qualidade e políticas', multimedia: 'Multimédia' })[section];
}

function initialValues(section: Section, i: InstituicaoEditor): Record<string, string> {
  const source = section === 'identidade' ? i.identidade : section === 'localizacao-contactos'
    ? {
      ...i.localizacao,
      email: i.contactos?.contactos.find(contact => contact.tipo === 'email')?.valor,
      telefone: i.contactos?.contactos.find(contact => contact.tipo === 'telefone')?.valor,
      website: i.contactos?.website,
    }
    : i[section] ?? {};
  return Object.fromEntries(Object.entries(source).map(([key, value]) => {
    if (Array.isArray(value)) return [key, value.join('\n')];
    if (typeof value === 'string' || typeof value === 'number') return [key, String(value)];
    return [key, ''];
  }));
}

async function saveSection(section: Section, f: Record<string, string>, i: InstituicaoEditor) {
  if (section === 'identidade') {
    const anoFundacao = Number(f['anoFundacao']);
    const { anoFundacao: omitted, ...rest } = f;
    void omitted;
    return instituicoesApi.save('identidade', {
      ...i.identidade,
      ...rest,
      ...(Number.isInteger(anoFundacao) ? { anoFundacao } : {}),
    });
  }
  if (section === 'localizacao-contactos') {
    const localizacao = EnderecoAngolaSchema.parse({
      pais: 'AO', provincia: f['provincia'], municipio: f['municipio'] ?? '',
      comuna: f['comuna'] || undefined, rua: f['rua'] || undefined,
      requerConfirmacaoTerritorial: false,
    });
    await instituicoesApi.save('localizacao', localizacao);
    return instituicoesApi.save('contactos', { website: f['website'] || undefined, contactos: [
      { tipo: 'email' as const, valor: f['email'] ?? '', publico: true },
      { tipo: 'telefone' as const, valor: f['telefone'] ?? '', publico: true },
    ].filter(item => item.valor.length > 0) });
  }
  if (section === 'oferta') {
    const oferta = OfertaInstituicaoSchema.parse({
      niveisEnsino: lines(f['niveisEnsino'] ?? ''),
      areasAtividade: lines(f['areasAtividade'] ?? ''),
      servicos: lines(f['servicos'] ?? ''),
    });
    return instituicoesApi.save('oferta', oferta);
  }
  if (section === 'recursos') {
    const estudantes = f['numeroEstudantes'] === '' ? undefined : Number(f['numeroEstudantes']);
    const docentes = f['numeroDocentes'] === '' ? undefined : Number(f['numeroDocentes']);
    return instituicoesApi.save('recursos', {
      numeroEstudantes: estudantes,
      numeroDocentes: docentes,
      infraestruturas: lines(f['infraestruturas'] ?? ''),
      acessibilidade: lines(f['acessibilidade'] ?? ''),
    });
  }
  if (section === 'qualidade') return instituicoesApi.save('qualidade', {
    acreditacoes: lines(f['acreditacoes'] ?? '').map(nome => ({ nome, entidade: nome })),
    certificacoes: lines(f['certificacoes'] ?? '').map(nome => ({ nome, entidade: nome })),
    politicas: lines(f['politicas'] ?? '').map(line => {
      const separator = line.indexOf('|');
      return separator > 0
        ? { titulo: line.slice(0, separator).trim(), url: line.slice(separator + 1).trim() }
        : null;
    }).filter((item): item is { titulo: string; url: string } => item !== null),
  });
  return instituicoesApi.save('multimedia', {
    logoUrl: f['logoUrl'] || undefined,
    capaUrl: f['capaUrl'] || undefined,
    videoUrl: f['videoUrl'] || undefined,
    galeriaUrls: lines(f['galeriaUrls'] ?? ''),
    redesSociais: i.multimedia?.redesSociais ?? {},
  });
}
