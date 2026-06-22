import { createHash } from 'node:crypto';
import {
  ConsentStateSchema,
  type AceiteLegal,
  type ConsentimentoEncarregado,
  type ConsentPurpose,
  type ConsentState,
  type ConsentType,
  type Role,
  resolveEstadoMenoridade,
} from '@pdc/shared';
import { writeAuditLog } from '../../middleware/audit.js';
import { strapiGet, strapiPost, strapiPut } from '../strapi/strapi.client.js';

type ConsentSource = 'registo_email' | 'oauth' | 'admin' | 'importacao_institucional' | 'reconsentimento';

interface PerfilConsentData {
  id?: string | number;
  documentId?: string;
  consents?: unknown;
}

interface RecordConsentInput {
  userId: string;
  perfilId: string | number;
  perfilDocumentId?: string;
  actorRole: Role;
  finalidade: ConsentPurpose;
  versao: string;
  concedido: boolean;
  source: ConsentSource;
  ip?: string;
  userAgent?: string;
  tipo?: ConsentType;
  titularMenor?: boolean;
  encarregadoNome?: string;
  encarregadoEmail?: string;
  metadata?: Record<string, unknown>;
}

interface RecordLegalAcceptanceInput {
  userId: string;
  perfilId: string | number;
  perfilDocumentId?: string;
  actorRole: Role;
  aceiteLegal: AceiteLegal;
  source: ConsentSource;
  dataNascimento?: string;
  consentimentoEncarregado?: ConsentimentoEncarregado;
  ip?: string;
  userAgent?: string;
}

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

function parseConsentState(value: unknown): ConsentState {
  const parsed = ConsentStateSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

async function resolveCurrentConsents(perfilId: string | number): Promise<ConsentState> {
  const res = await strapiGet<PerfilConsentData>('/perfis', {
    'filters[id][$eq]': String(perfilId),
    'fields[0]': 'consents',
    'pagination[pageSize]': '1',
  });
  return parseConsentState(res.data[0]?.consents);
}

async function updatePerfilConsentState(input: RecordConsentInput): Promise<void> {
  if (!input.tipo) return;
  const current = await resolveCurrentConsents(input.perfilId);
  const at = new Date().toISOString();
  const next: ConsentState = {
    ...current,
    [input.tipo]: {
      tipo: input.tipo,
      versao: input.versao,
      concedido: input.concedido,
      at,
      ...(input.ip ? { ipHash: hashIp(input.ip) } : {}),
    },
  };
  await strapiPut(`/perfis/${input.perfilDocumentId ?? String(input.perfilId)}`, { consents: next });
}

async function record(input: RecordConsentInput): Promise<void> {
  const now = new Date().toISOString();
  const perfilRelationId = input.perfilDocumentId ?? String(input.perfilId);
  await updatePerfilConsentState(input);
  await strapiPost('/consentimentos', {
    userId: input.userId,
    perfil: perfilRelationId,
    finalidade: input.finalidade,
    ...(input.tipo ? { tipo: input.tipo } : {}),
    estado: input.concedido ? 'aceite' : 'recusado',
    documentVersion: input.versao,
    versao: input.versao,
    concedido: input.concedido,
    acceptedAt: input.concedido ? now : undefined,
    serverTimestamp: now,
    source: input.source,
    actorRole: input.actorRole,
    titularMenor: input.titularMenor ?? false,
    ...(input.encarregadoNome ? { encarregadoNome: input.encarregadoNome } : {}),
    ...(input.encarregadoEmail ? { encarregadoEmail: input.encarregadoEmail } : {}),
    ...(input.ip ? { ipHash: hashIp(input.ip) } : {}),
    ...(input.userAgent ? { userAgent: input.userAgent } : {}),
    ...(input.metadata ? { metadata: input.metadata } : {}),
  });
  await writeAuditLog({
    actor: { id: input.userId, role: input.actorRole },
    accao: 'consentimento_registado',
    recurso: 'consentimento',
    ip: input.ip ?? 'unknown',
    ...(input.userAgent ? { userAgent: input.userAgent } : {}),
    detalhes: {
      finalidade: input.finalidade,
      tipo: input.tipo,
      versao: input.versao,
      concedido: input.concedido,
      perfilId: String(input.perfilId),
    },
  });
}

async function recordLegalAcceptance(input: RecordLegalAcceptanceInput): Promise<void> {
  const titularMenor = resolveEstadoMenoridade(input.dataNascimento) === 'menor';
  await record({
    ...input,
    finalidade: 'termos_uso',
    tipo: 'termos',
    versao: input.aceiteLegal.termosUsoVersao,
    concedido: true,
    titularMenor,
  });
  await record({
    ...input,
    finalidade: 'politica_privacidade',
    tipo: 'privacidade',
    versao: input.aceiteLegal.politicaPrivacidadeVersao,
    concedido: true,
    titularMenor,
  });
  await record({
    ...input,
    finalidade: 'tratamento_dados',
    versao: input.aceiteLegal.tratamentoDadosVersao,
    concedido: true,
    titularMenor,
  });

  if (input.consentimentoEncarregado) {
    await record({
      ...input,
      finalidade: 'encarregado_educacao',
      versao: input.aceiteLegal.termosUsoVersao,
      concedido: true,
      titularMenor,
      encarregadoNome: input.consentimentoEncarregado.nome,
      encarregadoEmail: input.consentimentoEncarregado.email,
      metadata: { parentesco: input.consentimentoEncarregado.parentesco },
    });
  }
}

export const consentService = {
  record,
  recordLegalAcceptance,
};
