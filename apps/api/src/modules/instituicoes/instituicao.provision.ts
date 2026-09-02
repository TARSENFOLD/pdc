import {
  StrapiHttpError,
  strapiGet,
  strapiPost,
  strapiPut,
} from '../strapi/strapi.client.js';
import { persistedId, type StrapiInstituicao, type StrapiPerfilGestor } from './instituicao.types.js';
import { acquireLock, type LockHandle } from '../../lib/distributed-lock.js';
import pino from 'pino';

const PROVISION_LOCK_TTL_MS = 30_000;
const PROVISION_LOCK_RENEW_INTERVAL_MS = PROVISION_LOCK_TTL_MS / 3;
const log = pino({ name: 'instituicao-provision' });

export type ProvisionInstituicaoInput = {
  nome: string;
  nomeLegal?: string;
  tipo?: string;
  natureza?: string;
  regiao?: string;
  nif?: string;
};

function provisionLeaseError(cause?: unknown): Error {
  return Object.assign(new Error('Lease do provisionamento institucional expirou; tenta novamente'), {
    status: 503,
    retryable: true,
    cause,
  });
}

function startProvisionLease(lock: LockHandle): {
  assertActive: () => Promise<void>;
  stop: () => Promise<void>;
} {
  let leaseLost = false;
  let lostCause: unknown;
  let renewal: Promise<void> | undefined;

  const ensureRenewal = (): Promise<void> => {
    if (!renewal) {
      renewal = lock.extend(PROVISION_LOCK_TTL_MS)
        .then((extended) => {
          if (!extended) {
            leaseLost = true;
            lostCause = new Error('Lock ownership lost');
          }
        })
        .catch((cause: unknown) => {
          leaseLost = true;
          lostCause = cause;
        })
        .finally(() => {
          renewal = undefined;
        });
    }
    return renewal;
  };

  const timer = setInterval(() => {
    void ensureRenewal();
  }, PROVISION_LOCK_RENEW_INTERVAL_MS);
  timer.unref();

  const assertNotLost = (): void => {
    if (leaseLost) throw provisionLeaseError(lostCause);
  };

  return {
    assertActive: async () => {
      assertNotLost();
      await ensureRenewal();
      assertNotLost();
    },
    stop: async () => {
      clearInterval(timer);
      if (renewal) await renewal;
    },
  };
}

function slugify(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export type InstituicaoReference = Pick<StrapiInstituicao, 'id' | 'nome'> & {
  documentId?: string;
};

export interface ProvisionInstituicaoResult {
  instituicao: InstituicaoReference;
  created: boolean;
}

function instituicaoReference(instituicao: StrapiInstituicao): InstituicaoReference {
  return {
    id: instituicao.id,
    ...(instituicao.documentId ? { documentId: instituicao.documentId } : {}),
    nome: instituicao.nome,
  };
}

function confirmsUniqueConstraint(body: unknown): boolean {
  if (typeof body !== 'object' || body === null || !('error' in body)) return false;
  const error = body.error;
  if (typeof error !== 'object' || error === null) return false;
  const errorMessage = 'message' in error && typeof error.message === 'string'
    ? error.message
    : '';
  if (!('details' in error) || typeof error.details !== 'object' || error.details === null) {
    return false;
  }
  if (!('errors' in error.details) || !Array.isArray(error.details.errors)) return false;
  return error.details.errors.some((entry: unknown) => {
    if (typeof entry !== 'object' || entry === null || !('path' in entry)) return false;
    const isSlugPath = Array.isArray(entry.path)
      ? entry.path.some((part: unknown) => part === 'slug')
      : entry.path === 'slug';
    if (!isSlugPath) return false;
    const entryMessage = 'message' in entry && typeof entry.message === 'string'
      ? entry.message
      : '';
    return /unique/i.test(errorMessage) || /unique/i.test(entryMessage);
  });
}

async function createOrGetInstituicao(
  slug: string,
  input: ProvisionInstituicaoInput,
): Promise<{ instituicao: StrapiInstituicao; created: boolean }> {
  try {
    const created = await strapiPost<StrapiInstituicao>('/instituicoes', {
      nome: input.nome,
      nomeLegal: input.nomeLegal ?? input.nome,
      slug,
      tipo: input.tipo ?? 'outro',
      natureza: input.natureza,
      regiao: input.regiao,
      nif: input.nif,
      estado: 'draft',
      aprovada: false,
      documentosLegais: [],
      branding: {},
    });
    return { instituicao: created.data, created: true };
  } catch (error) {
    const isUniqueConflict = error instanceof StrapiHttpError
      && (error.status === 400 || error.status === 409)
      && confirmsUniqueConstraint(error.body);
    if (!isUniqueConflict) throw error;
    const existing = await strapiGet<StrapiInstituicao>('/instituicoes', {
      'filters[slug][$eq]': slug,
      'pagination[pageSize]': '1',
    });
    const instituicao = existing.data[0];
    if (!instituicao) throw error;
    return { instituicao, created: false };
  }
}

async function provisionWhileLocked(
  userId: string,
  input: ProvisionInstituicaoInput,
  assertLeaseActive: () => Promise<void>,
): Promise<ProvisionInstituicaoResult> {
  const perfis = await strapiGet<StrapiPerfilGestor>('/perfis', {
    'filters[userId][$eq]': userId,
    'populate[instituicaoGerida][fields][0]': 'id',
    'populate[instituicaoGerida][fields][1]': 'documentId',
    'populate[instituicaoGerida][fields][2]': 'nome',
    'pagination[pageSize]': '1',
  });
  const perfil = perfis.data[0];
  if (!perfil) throw Object.assign(new Error('Perfil institucional não encontrado'), { status: 404 });
  if (perfil.instituicaoGerida) {
    return { instituicao: instituicaoReference(perfil.instituicaoGerida), created: false };
  }

  await assertLeaseActive();
  const slug = `instituicao-gestor-${slugify(userId)}`;
  const provisioned = await createOrGetInstituicao(slug, input);
  const instituicao = provisioned.instituicao;
  try {
    await assertLeaseActive();
    await strapiPut(`/perfis/${persistedId(perfil)}`, { instituicaoGerida: instituicao.id });
  } catch (error) {
    const upstreamStatus = error instanceof StrapiHttpError ? error.status : undefined;
    const retryable = upstreamStatus === undefined || upstreamStatus === 429 || upstreamStatus >= 500;
    const message = retryable
      ? 'Instituição criada, mas ligação ao gestor pendente de retry'
      : 'Instituição criada, mas a associação ao gestor foi rejeitada';
    throw Object.assign(new Error(message), {
      status: retryable ? 503 : upstreamStatus,
      retryable,
      instituicaoId: instituicao.id,
      cause: error,
    });
  }
  return { instituicao: instituicaoReference(instituicao), created: provisioned.created };
}

export async function provisionInstituicaoForUser(
  userId: string,
  input: ProvisionInstituicaoInput,
): Promise<ProvisionInstituicaoResult> {
  let lock: LockHandle | null;
  try {
    lock = await acquireLock(`instituicao:provision:${userId}`, PROVISION_LOCK_TTL_MS);
  } catch (cause) {
    throw Object.assign(new Error('Provisionamento institucional temporariamente indisponível'), {
      status: 503,
      retryable: true,
      cause,
    });
  }
  if (!lock) {
    throw Object.assign(new Error('Provisionamento institucional em curso; tenta novamente'), {
      status: 503,
      retryable: true,
    });
  }

  const lease = startProvisionLease(lock);
  let result: ProvisionInstituicaoResult;
  try {
    result = await provisionWhileLocked(userId, input, lease.assertActive);
  } catch (cause) {
    await lease.stop();
    await lock.release().catch((releaseErr: unknown) => {
      log.error(
        { err: releaseErr, userId, cause },
        'Falha ao libertar o lease institucional após erro de provisionamento',
      );
    });
    throw cause;
  }

  await lease.stop();
  try {
    const released = await lock.release();
    if (!released) {
      log.warn(
        { userId, fencingToken: lock.fencingToken },
        'Reparação terminou depois da expiração do lease; resultado idempotente preservado',
      );
    }
  } catch (releaseErr) {
    log.error(
      { err: releaseErr, userId, fencingToken: lock.fencingToken },
      'Falha ao libertar o lease institucional após provisionamento concluído',
    );
  }

  return result;
}
