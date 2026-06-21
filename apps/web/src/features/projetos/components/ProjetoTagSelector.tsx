import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button, Input } from '@/components/ui';

interface ProjetoTagSelectorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  error?: string | undefined;
}

export function ProjetoTagSelector({ tags, onChange, error }: ProjetoTagSelectorProps): React.JSX.Element {
  const [input, setInput] = useState('');

  const addTag = () => {
    const tag = input.trim().replace(/^#/, '');
    if (!tag || tags.some((current) => current.toLowerCase() === tag.toLowerCase())) {
      setInput('');
      return;
    }
    if (tags.length >= 10) {
      setInput('');
      return;
    }
    onChange([...tags, tag]);
    setInput('');
  };

  return (
    <div className="space-y-3" aria-label="Tags do projeto">
      <div className="flex gap-2">
        <Input
          label="Tags"
          value={input}
          maxLength={40}
          placeholder="Ex.: Saúde Angola"
          onChange={(event) => { setInput(event.target.value); }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault();
              addTag();
            }
          }}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          aria-label="Adicionar tag"
          disabled={tags.length >= 10 || input.trim().length === 0}
          onClick={addTag}
          className="mt-6 min-h-10 min-w-10 px-0"
        >
          <Plus size={16} />
        </Button>
      </div>
      <div className="flex items-center justify-between text-xs text-ink-tertiary">
        <span>Usa termos que ajudem talentos e instituições a encontrar o projeto.</span>
        <span>{tags.length}/10</span>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1.5 rounded-sm border border-accent/20 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
              #{tag}
              <button
                type="button"
                aria-label={`Remover tag ${tag}`}
                onClick={() => { onChange(tags.filter((current) => current !== tag)); }}
                className="text-accent/70 hover:text-accent"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      {error && <p className="text-xs text-accent-danger">{error}</p>}
    </div>
  );
}
