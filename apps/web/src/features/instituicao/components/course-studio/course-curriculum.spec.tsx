import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { CriarCursoPayloadSchema, type CriarCursoPayload } from '@pdc/shared';
import { CourseCurriculum } from '../CourseCurriculum';
import { duplicateCourseModule, normalizeCourseItems, reorderDrafts } from './course-curriculum';

const defaultValues: CriarCursoPayload = {
  titulo: 'Curso de teste',
  descricao: 'Descrição válida para o curso de teste.',
  area: 'TECNOLOGIA',
  nivel: 'medio',
  visibilidade: 'publico',
  gratuito: true,
  preco: 0,
  moeda: 'AOA',
  comissao: 0,
  requerValidacaoComite: false,
  regrasAcesso: { minFluidez: 0, minResiliencia: 0, minFoco: 0 },
  modulos: [
    {
      persistedId: 'module-persisted',
      titulo: 'Introdução',
      ordem: 1,
      itens: [
        {
          persistedId: 'item-persisted',
          titulo: 'Boas-vindas',
          tipo: 'texto',
          ordem: 1,
          conteudo: 'Olá',
        },
      ],
    },
  ],
};

beforeAll(() => {
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
});

function CurriculumHarness(): React.JSX.Element {
  const form = useForm<CriarCursoPayload>({ defaultValues });
  const modules = useFieldArray({ control: form.control, name: 'modulos' });
  return (
    <CourseCurriculum
      register={form.register}
      control={form.control}
      setValue={form.setValue}
      trigger={form.trigger}
      modulosArray={modules}
    />
  );
}

function InvalidGalleryHarness(): React.JSX.Element {
  const form = useForm<CriarCursoPayload>({
    resolver: zodResolver(CriarCursoPayloadSchema),
    defaultValues: {
      ...defaultValues,
      modulos: [
        {
          ...defaultValues.modulos[0],
          titulo: 'Introdução',
          ordem: 1,
          itens: [
            {
              titulo: 'Aula ilustrada',
              tipo: 'texto',
              ordem: 1,
              conteudo: 'Conteúdo completo da aula.',
              imagens: [{ url: 'https://cdn.example.com/imagem.webp', alt: '' }],
            },
          ],
        },
      ],
    },
  });
  const modules = useFieldArray({ control: form.control, name: 'modulos' });
  return (
    <CourseCurriculum
      register={form.register}
      control={form.control}
      setValue={form.setValue}
      trigger={form.trigger}
      modulosArray={modules}
    />
  );
}

describe('course curriculum helpers', () => {
  it('reordena e normaliza a ordem sem perder os dados', () => {
    const reordered = reorderDrafts(
      [
        { titulo: 'Primeiro', ordem: 1 },
        { titulo: 'Segundo', ordem: 2 },
      ],
      1,
      0
    );

    expect(reordered).toEqual([
      { titulo: 'Segundo', ordem: 1 },
      { titulo: 'Primeiro', ordem: 2 },
    ]);
  });

  it('duplica um módulo sem reutilizar identificadores persistidos', () => {
    const source = defaultValues.modulos[0];
    if (!source) throw new Error('Fixture sem módulo');
    const duplicate = duplicateCourseModule(source, 2);

    expect(duplicate.titulo).toBe('Introdução (cópia)');
    expect(duplicate).not.toHaveProperty('persistedId');
    expect(duplicate.itens[0]).not.toHaveProperty('persistedId');
  });

  it('mantém o vídeo na primeira posição sem alterar a ordem relativa restante', () => {
    const items = normalizeCourseItems([
      { titulo: 'Texto inicial', tipo: 'texto', ordem: 1 },
      { titulo: 'Vídeo de abertura', tipo: 'video', ordem: 2 },
      { titulo: 'Quiz final', tipo: 'quiz', ordem: 3 },
    ]);

    expect(items.map((item) => item.titulo)).toEqual([
      'Vídeo de abertura',
      'Texto inicial',
      'Quiz final',
    ]);
    expect(items.map((item) => item.ordem)).toEqual([1, 2, 3]);
  });
});

describe('CourseCurriculum', () => {
  it('bloqueia a eliminação do último módulo e explica a regra', () => {
    render(<CurriculumHarness />);

    const deleteButton = screen.getByRole('button', { name: 'Eliminar módulo' });
    expect(deleteButton).toBeDisabled();
    expect(screen.getByText(/O curso precisa de pelo menos um módulo/)).toBeVisible();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('adiciona aulas por tipo e duplica módulos pela interface', async () => {
    render(<CurriculumHarness />);

    expect(screen.getByText('1 módulo · 1 aula')).toBeDefined();
    expect(screen.getByPlaceholderText(/Nesta aula vais compreender/)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar aula' }));
    fireEvent.click(screen.getByRole('button', { name: /Vídeo.*Aula em vídeo/ }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(await screen.findByText('1 módulo · 2 aulas')).toBeDefined();
    expect(screen.getByText('Nova aula — Vídeo')).toBeDefined();
    expect(screen.getByPlaceholderText('https://')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Duplicar módulo' }));
    expect(await screen.findByText('2 módulos · 4 aulas')).toBeDefined();
    expect(screen.getByText('Introdução (cópia)')).toBeDefined();
  });

  it('cria o módulo no fim da lista e abre-o para edição', async () => {
    render(<CurriculumHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar módulo' }));

    expect(await screen.findByText('2 módulos · 2 aulas')).toBeDefined();
    expect(screen.getByDisplayValue('Módulo 2')).toBeDefined();
    expect(screen.getByText('O novo módulo será aberto aqui, pronto para editar.')).toBeDefined();
  });

  it('impede um segundo vídeo no mesmo módulo', async () => {
    render(<CurriculumHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar aula' }));
    fireEvent.click(screen.getByRole('button', { name: /Vídeo.*Aula em vídeo/ }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar aula' }));

    const unavailableVideo = screen.getByRole('button', { name: /Vídeo.*já tem o seu vídeo/ });
    expect(unavailableVideo.hasAttribute('disabled')).toBe(true);
  });

  it('mantém o vídeo de abertura no topo após drag-and-drop', async () => {
    render(<CurriculumHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar aula' }));
    fireEvent.click(screen.getByRole('button', { name: /Vídeo.*Aula em vídeo/ }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    const transfer = new Map<string, string>();
    const dataTransfer = {
      setData: (type: string, value: string) => {
        transfer.set(type, value);
      },
      getData: (type: string) => transfer.get(type) ?? '',
    };
    const videoHandle = screen.getByRole('button', { name: 'Arrastar aula 1' });
    const textTitle = screen.getByText('Boas-vindas');
    const textCard = textTitle.closest('article');
    if (!textCard) throw new Error('Card da aula de texto não encontrado');

    fireEvent.dragStart(videoHandle, { dataTransfer });
    fireEvent.drop(textCard, { dataTransfer });

    const titles = screen
      .getAllByText(/^(Nova aula — Vídeo|Boas-vindas)$/)
      .map((element) => element.textContent);
    expect(titles).toEqual(['Nova aula — Vídeo', 'Boas-vindas']);
  });

  it('explica junto ao botão porque uma aula com imagem sem descrição não pode ser fechada', async () => {
    render(<InvalidGalleryHarness />);

    expect(
      screen.getByText('Adiciona uma descrição acessível com pelo menos 3 caracteres.')
    ).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Validar e fechar aula' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Descreve a imagem 1 da aula 1.1.');
    expect(screen.getByRole('button', { name: 'Validar e fechar aula' })).toBeDefined();
  });
});
