import { useQuery } from '@tanstack/react-query';
import { BookOpen, FlaskConical, FolderKanban, MapPin } from 'lucide-react';
import { cursosApi } from '@/lib/api/cursos';
import { experienciasApi } from '@/lib/api/experiencias';
import { projetosApi } from '@/lib/api/projetos';
import { simulacoesApi } from '@/lib/api/simulacoes';
import { Spinner } from '@/components/ui';

type RelationField = 'cursosIds' | 'experienciasIds' | 'simulacoesIds' | 'projetosIds';

interface SelectableContent {
  id: string;
  matchIds: string[];
  titulo: string;
  detail: string | undefined;
}

interface ContentGroup {
  field: RelationField;
  label: string;
  icon: typeof BookOpen;
  items: SelectableContent[];
  isError: boolean;
}

interface ProgramaContentSelectorProps {
  selected: Record<RelationField, string[]>;
  onChange: (field: RelationField, ids: string[]) => void;
}

function contentId(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return String(value);
  return typeof value === 'string' ? value : null;
}

function selectableContentIds(item: { id: unknown; documentId?: unknown }): { id: string; matchIds: string[] } | null {
  const id = contentId(item.id);
  if (!id) return null;
  const documentId = contentId(item.documentId);
  return {
    id,
    matchIds: documentId && documentId !== id ? [id, documentId] : [id],
  };
}

function selectableContent(
  ids: { id: string; matchIds: string[] } | null,
  titulo: string,
  detail: string | undefined,
): SelectableContent[] {
  return ids ? [{ ...ids, titulo, detail }] : [];
}

export default function ProgramaContentSelector({
  selected,
  onChange,
}: ProgramaContentSelectorProps): React.JSX.Element {
  const cursos = useQuery({
    queryKey: ['programa-selector', 'cursos'],
    queryFn: () => cursosApi.list({ pageSize: 50 }),
  });
  const experiencias = useQuery({
    queryKey: ['programa-selector', 'experiencias'],
    queryFn: () => experienciasApi.list({ pageSize: 50 }),
  });
  const simulacoes = useQuery({
    queryKey: ['programa-selector', 'simulacoes'],
    queryFn: () => simulacoesApi.list({ pageSize: 50 }),
  });
  const projetos = useQuery({
    queryKey: ['programa-selector', 'projetos'],
    queryFn: () => projetosApi.list({ page: 1, pageSize: 50, estado: 'published' }),
  });

  const isLoading = cursos.isLoading || experiencias.isLoading || simulacoes.isLoading || projetos.isLoading;
  const groups: ContentGroup[] = [
    {
      field: 'cursosIds',
      label: 'Cursos',
      icon: BookOpen,
      isError: cursos.isError,
      items: (cursos.data?.data ?? []).flatMap((item) =>
        selectableContent(selectableContentIds(item), item.titulo, item.nivel)),
    },
    {
      field: 'experienciasIds',
      label: 'Experiências',
      icon: MapPin,
      isError: experiencias.isError,
      items: (experiencias.data?.data ?? []).flatMap((item) =>
        selectableContent(selectableContentIds(item), item.titulo, item.area ?? undefined)),
    },
    {
      field: 'simulacoesIds',
      label: 'Simulações',
      icon: FlaskConical,
      isError: simulacoes.isError,
      items: (simulacoes.data?.data ?? []).flatMap((item) =>
        selectableContent(selectableContentIds(item), item.titulo, item.area)),
    },
    {
      field: 'projetosIds',
      label: 'Projetos',
      icon: FolderKanban,
      isError: projetos.isError,
        items: (projetos.data?.data ?? []).flatMap((item) =>
          selectableContent(selectableContentIds(item), item.titulo, item.area)),
    },
  ];

  if (isLoading) {
    return <div className="flex min-h-48 items-center justify-center"><Spinner size="md" /></div>;
  }
  return (
    <div className="space-y-6" role="region" aria-label="Conteúdos Agrupados">
      {groups.map((group) => (
        <ContentGroupList
          key={group.field}
          group={group}
          selected={selected[group.field]}
          onChange={(ids) => { onChange(group.field, ids); }}
        />
      ))}
    </div>
  );
}

function ContentGroupList({
  group,
  selected,
  onChange,
}: {
  group: ContentGroup;
  selected: string[];
  onChange: (ids: string[]) => void;
}): React.JSX.Element {
  const Icon = group.icon;

  return (
    <section className="space-y-3" aria-label={group.label}>
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-primary">
          <Icon size={16} className="text-accent" />
          {group.label}
        </h3>
        <span className="text-xs text-ink-tertiary">{selected.length} selecionado(s)</span>
      </div>
      {group.items.length === 0 ? (
        <p className={group.isError ? 'py-3 text-sm text-error' : 'py-3 text-sm text-ink-tertiary'}>
          {group.isError
            ? `Não foi possível carregar ${group.label.toLowerCase()}.`
            : 'Nenhum conteúdo publicado disponível.'}
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {group.items.map((item) => {
            const checked = selected.some((id) => item.matchIds.includes(id));
            return (
              <label
                key={item.id}
                className="flex min-h-14 cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:border-accent/40 hover:bg-recessed"
              >
                <input
                  type="checkbox"
                  value={item.id}
                  checked={checked}
                  onChange={() => {
                    onChange(checked
                      ? selected.filter((id) => !item.matchIds.includes(id))
                      : [...selected, item.id]);
                  }}
                  className="mt-1 h-4 w-4 accent-[var(--accent-terracotta)]"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink-primary">{item.titulo}</span>
                  {item.detail && <span className="text-xs text-ink-tertiary">{item.detail}</span>}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </section>
  );
}
