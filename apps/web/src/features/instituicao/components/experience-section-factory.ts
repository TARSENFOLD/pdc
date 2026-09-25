import type { ExperienciaItem, ExperienciaSecao } from '@pdc/shared';
import { createUuid } from '@/lib/uuid';

function newItem(ordem: number): ExperienciaItem {
  return { id: createUuid(), tipo: 'texto', ordem, titulo: 'Novo conteúdo', conteudo: '' };
}

export function newExperienceSection(
  tipo: ExperienciaSecao['tipo'],
  ordem: number,
  titulo: string,
): ExperienciaSecao {
  return {
    id: createUuid(),
    titulo,
    tipo,
    ordem,
    obrigatoria: ['boas_vindas', 'realidade', 'depoimentos', 'infraestrutura', 'proximos_passos'].includes(tipo),
    visibilidade: 'publico',
    descricao: '',
    itens: [newItem(0)],
  };
}

export function newExperienceItem(ordem: number): ExperienciaItem {
  return newItem(ordem);
}
