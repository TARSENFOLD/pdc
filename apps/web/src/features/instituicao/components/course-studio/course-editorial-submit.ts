import type { CriarCursoPayload, CursoMeu } from '@pdc/shared';

interface CourseEditorialApi {
  create: (payload: CriarCursoPayload) => Promise<CursoMeu>;
  update: (id: string, payload: Partial<CriarCursoPayload>) => Promise<CursoMeu>;
  updateEstado: (id: string, estado: 'review') => Promise<{ success: boolean }>;
}

interface SaveAndSubmitCourseOptions {
  api: CourseEditorialApi;
  payload: CriarCursoPayload;
  courseId?: string;
}

export class CourseDraftSubmissionError extends Error {
  readonly draftId: string;
  readonly reason: string;

  constructor(draftId: string, cause: unknown) {
    super('O rascunho foi guardado, mas não foi possível submetê-lo para revisão.', { cause });
    this.name = 'CourseDraftSubmissionError';
    this.draftId = draftId;
    this.reason = cause instanceof Error ? cause.message : 'Serviço de revisão indisponível.';
  }
}

export async function saveAndSubmitCourse({
  api,
  payload,
  courseId,
}: SaveAndSubmitCourseOptions): Promise<string> {
  let draftId = courseId;
  if (draftId) {
    await api.update(draftId, { ...payload, estado: 'draft' });
  } else {
    const created = await api.create({ ...payload, estado: 'draft' });
    draftId = created.documentId ?? created.id;
  }

  try {
    const result = await api.updateEstado(draftId, 'review');
    if (!result.success) {
      throw new Error('O serviço não confirmou a submissão para revisão.');
    }
  } catch (error) {
    throw new CourseDraftSubmissionError(draftId, error);
  }
  return draftId;
}
