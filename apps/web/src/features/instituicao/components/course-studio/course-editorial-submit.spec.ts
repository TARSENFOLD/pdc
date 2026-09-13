import { describe, expect, it, vi } from 'vitest';
import type { CriarCursoPayload, CursoMeu } from '@pdc/shared';
import { CourseDraftSubmissionError, saveAndSubmitCourse } from './course-editorial-submit';

const payload: CriarCursoPayload = {
  titulo: 'Curso pronto',
  descricao: 'Descrição suficientemente completa.',
  area: 'TECNOLOGIA',
  nivel: 'medio',
  regrasAcesso: {},
  modulos: [{
    titulo: 'Módulo inicial',
    ordem: 1,
    itens: [{ titulo: 'Primeira aula', tipo: 'texto', conteudo: 'Conteúdo completo.', ordem: 1 }],
  }],
};

function courseResponse(): CursoMeu {
  return {
    id: '42',
    documentId: 'course-document-id',
    slug: 'curso-pronto',
    titulo: payload.titulo,
    descricao: payload.descricao,
    totalHoras: 0,
    estado: 'draft',
    autorId: 'creator-1',
  };
}

function apiMock() {
  return {
    create: vi.fn().mockResolvedValue(courseResponse()),
    update: vi.fn().mockResolvedValue(courseResponse()),
    updateEstado: vi.fn().mockResolvedValue({ success: true }),
  };
}

describe('saveAndSubmitCourse', () => {
  it('cria o rascunho novo e submete usando o documentId estável', async () => {
    const api = apiMock();

    await expect(saveAndSubmitCourse({ api, payload })).resolves.toBe('course-document-id');
    expect(api.create).toHaveBeenCalledWith({ ...payload, estado: 'draft' });
    expect(api.update).not.toHaveBeenCalled();
    expect(api.updateEstado).toHaveBeenCalledWith('course-document-id', 'review');
  });

  it('guarda o curso existente antes de o submeter', async () => {
    const api = apiMock();

    await expect(saveAndSubmitCourse({ api, payload, courseId: 'existing-id' })).resolves.toBe('existing-id');
    expect(api.update).toHaveBeenCalledWith('existing-id', { ...payload, estado: 'draft' });
    expect(api.create).not.toHaveBeenCalled();
    expect(api.updateEstado).toHaveBeenCalledWith('existing-id', 'review');
  });

  it('preserva a referência do rascunho quando a submissão falha', async () => {
    const api = apiMock();
    api.updateEstado.mockRejectedValueOnce(new Error('Revisão indisponível'));

    const error = await saveAndSubmitCourse({ api, payload }).catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(CourseDraftSubmissionError);
    expect(error).toMatchObject({ draftId: 'course-document-id', reason: 'Revisão indisponível' });
  });

  it('trata uma resposta sem confirmação como falha e preserva o rascunho', async () => {
    const api = apiMock();
    api.updateEstado.mockResolvedValueOnce({ success: false });

    const error = await saveAndSubmitCourse({ api, payload }).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(CourseDraftSubmissionError);
    expect(error).toMatchObject({
      draftId: 'course-document-id',
      reason: 'O serviço não confirmou a submissão para revisão.',
    });
  });
});
