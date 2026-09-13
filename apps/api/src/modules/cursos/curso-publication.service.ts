import type { Curso } from '@pdc/shared';
import pino from 'pino';
import { eventBus } from '../events/event-bus.js';
import { DomainEventName } from '../events/types.js';
import { strapiPut } from '../strapi/strapi.client.js';
import { acquireLock, type LockHandle } from '../../lib/distributed-lock.js';
import { persistedId, resolveCursoDocumentId, resolveCursoReference } from './cursos.repository.js';

const log = pino({ name: 'curso-publication-service' });
const COURSE_TRANSITION_LOCK_TTL_MS = 30_000;
const COURSE_TRANSITION_RENEW_INTERVAL_MS = COURSE_TRANSITION_LOCK_TTL_MS / 3;

function transitionLeaseError(cause?: unknown): Error {
  return Object.assign(
    new Error('A transição editorial perdeu a exclusividade e precisa de reconciliação.'),
    { status: 503, retryable: true, cause }
  );
}

function startTransitionLease(lock: LockHandle): {
  assertActive: () => Promise<void>;
  stop: () => Promise<void>;
} {
  let leaseLost = false;
  let lostCause: unknown;
  let renewal: Promise<boolean> | undefined;
  const renew = (): Promise<boolean> => {
    renewal ??= lock
      .extend(COURSE_TRANSITION_LOCK_TTL_MS)
      .then((extended) => {
        if (!extended) {
          leaseLost = true;
          lostCause = new Error('Course transition lock ownership lost');
        }
        return extended;
      })
      .catch((cause: unknown) => {
        leaseLost = true;
        lostCause = cause;
        return false;
      })
      .finally(() => {
        renewal = undefined;
      });
    return renewal;
  };
  const timer = setInterval(() => {
    if (leaseLost) return;
    void renew();
  }, COURSE_TRANSITION_RENEW_INTERVAL_MS);
  timer.unref();

  return {
    assertActive: async () => {
      if (leaseLost) throw transitionLeaseError(lostCause);
      const extended = await renew();
      if (!extended) throw transitionLeaseError(lostCause);
    },
    stop: async () => {
      clearInterval(timer);
      if (renewal) await renewal;
    },
  };
}

async function compensateDraftState(
  cursoDocumentId: string,
  previousDraftState: Curso['estado'],
  transitionError: unknown,
  context: { cursoId: string; operation: 'publicação' | 'arquivamento' },
  assertLeaseActive: () => Promise<void>
): Promise<never> {
  try {
    await assertLeaseActive();
    await strapiPut(
      `/cursos/${cursoDocumentId}`,
      { estado: previousDraftState },
      { status: 'draft' }
    );
  } catch (compensationError) {
    log.error(
      {
        compensationError,
        transitionError,
        cursoId: context.cursoId,
        previousDraftState,
      },
      `Falha crítica ao compensar ${context.operation} do curso`
    );
    throw new AggregateError(
      [transitionError, compensationError],
      `${context.operation === 'publicação' ? 'Publicação' : 'Arquivamento'} falhou e o estado editorial precisa de reconciliação.`
    );
  }
  throw transitionError;
}

async function publishCourse(
  id: string,
  autorId: string,
  assertLeaseActive: () => Promise<void>
): Promise<void> {
  const currentDraft = await resolveCursoReference(id, 'draft');
  if (!currentDraft) throw Object.assign(new Error('Curso não encontrado'), { status: 404 });
  const cursoDocumentId = persistedId(currentDraft);
  const previousDraftState = currentDraft.estado;

  await assertLeaseActive();
  await strapiPut(`/cursos/${cursoDocumentId}`, { estado: 'published' }, { status: 'draft' });
  try {
    await assertLeaseActive();
    await strapiPut(`/cursos/${cursoDocumentId}`, { estado: 'approved' }, { status: 'published' });
  } catch (transitionError) {
    await compensateDraftState(
      cursoDocumentId,
      previousDraftState,
      transitionError,
      { cursoId: id, operation: 'publicação' },
      assertLeaseActive
    );
  }

  await eventBus.publishWithOutbox(DomainEventName.CURSO_PUBLICADO, {
    cursoId: id,
    autorId,
    titulo: currentDraft.titulo,
    area: currentDraft.area,
    regrasAcesso: currentDraft.regrasAcesso,
  });
}

async function archiveCourse(
  id: string,
  autorId: string,
  assertLeaseActive: () => Promise<void>
): Promise<void> {
  const currentDraft = await resolveCursoReference(id, 'draft');
  if (!currentDraft) throw Object.assign(new Error('Curso não encontrado'), { status: 404 });
  const cursoDocumentId = persistedId(currentDraft);
  const previousDraftState = currentDraft.estado;

  await assertLeaseActive();
  await strapiPut(`/cursos/${cursoDocumentId}`, { estado: 'archived' }, { status: 'draft' });
  try {
    await assertLeaseActive();
    await strapiPut(`/cursos/${cursoDocumentId}`, { estado: 'archived' }, { status: 'published' });
  } catch (transitionError) {
    await compensateDraftState(
      cursoDocumentId,
      previousDraftState,
      transitionError,
      { cursoId: id, operation: 'arquivamento' },
      assertLeaseActive
    );
  }

  await eventBus.publishWithOutbox(DomainEventName.CURSO_ARQUIVADO, {
    cursoId: id,
    autorId,
  });
}

export async function alterarEstadoCurso(
  id: string,
  estado: string,
  autorId: string,
  _curso?: Curso
): Promise<void> {
  let lock: LockHandle | null;
  try {
    lock = await acquireLock(`curso:transition:${id}`, COURSE_TRANSITION_LOCK_TTL_MS);
  } catch (cause) {
    throw transitionLeaseError(cause);
  }
  if (!lock) {
    throw Object.assign(new Error('Já existe uma transição editorial em curso para este curso.'), {
      status: 409,
      retryable: true,
    });
  }

  const lease = startTransitionLease(lock);
  try {
    if (estado === 'published') {
      await publishCourse(id, autorId, lease.assertActive);
      return;
    }
    if (estado === 'archived') {
      await archiveCourse(id, autorId, lease.assertActive);
      return;
    }

    const cursoDocumentId = await resolveCursoDocumentId(id);
    await lease.assertActive();
    await strapiPut(`/cursos/${cursoDocumentId}`, { estado }, { status: 'draft' });
  } finally {
    await lease.stop();
    await lock.release().catch((releaseError: unknown) => {
      log.error({ releaseError, cursoId: id }, 'Falha ao libertar lock de transição editorial');
    });
  }
}
