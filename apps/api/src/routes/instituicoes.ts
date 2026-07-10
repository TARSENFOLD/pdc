import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  ContactosInstituicaoSchema,
  EnderecoAngolaSchema,
  IdentidadeInstituicaoSchema,
  MultimediaInstituicaoSchema,
  OfertaInstituicaoSchema,
  QualidadeInstituicaoSchema,
  RecursosInstituicaoSchema,
  SubmeterVerificacaoInstituicaoSchema,
} from '@pdc/shared';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { instituicaoService } from '../modules/instituicoes/instituicao.service.js';
import { provisionInstituicaoForUser } from '../modules/instituicoes/instituicao.provision.js';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import { uploadToR2 } from '../modules/media/r2.service.js';
import { validateMagicBytes } from '../modules/media/file-type-guard.js';
import crypto from 'node:crypto';
import pino from 'pino';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

type Vars = { Variables: AuthVariables };
export const instituicaoRoutes = new Hono<Vars>();
const log = pino({ name: 'instituicoes-routes' });

instituicaoRoutes.use('*', verifyJwt);
instituicaoRoutes.use('*', checkRole(['instituicao', 'super_admin']));

const ProvisionarInstituicaoSchema = z.object({
  nome: z.string().trim().min(2).max(160).optional(),
});

instituicaoRoutes.post('/me/provisionar', async (c) => {
  const user = c.get('user');
  let body: unknown = {};
  const rawBody = await c.req.text();
  if (rawBody.trim() !== '') {
    try {
      body = z.unknown().parse(JSON.parse(rawBody));
    } catch {
      return c.json({ error: 'JSON inválido no corpo do pedido' }, 400);
    }
  }
  const validation = ProvisionarInstituicaoSchema.safeParse(body);
  if (!validation.success) {
    return c.json({ error: 'Dados de entrada inválidos' }, 400);
  }
  const input = validation.data;
  try {
    const result = await provisionInstituicaoForUser(user.id, {
      nome: input.nome ?? 'Nova Instituição',
    });
    return c.json({ data: result.instituicao }, result.created ? 201 : 200);
  } catch (error) {
    const err = error as { status?: number; message?: string; retryable?: boolean };
    const rawStatus = typeof err.status === 'number' ? err.status : 502;
    const status = rawStatus >= 200 && rawStatus < 600 ? rawStatus : 502;
    return c.json({
      error: err.message ?? 'Falha ao provisionar instituição',
      retryable: err.retryable === true,
    }, status as ContentfulStatusCode);
  }
});

instituicaoRoutes.get('/me', async (c) => {
  return c.json({ data: await instituicaoService.minha(c.get('user').id) });
});

instituicaoRoutes.patch('/me/identidade', zValidator('json', IdentidadeInstituicaoSchema), async (c) => {
  return c.json({ data: await instituicaoService.update(c.get('user').id, 'identidade', c.req.valid('json')) });
});
instituicaoRoutes.patch('/me/localizacao', zValidator('json', EnderecoAngolaSchema), async (c) => {
  const data = c.req.valid('json');
  return c.json({ data: await instituicaoService.update(c.get('user').id, 'localizacao', {
    enderecoEstruturado: data, regiao: data.provincia,
  }) });
});
instituicaoRoutes.patch('/me/contactos', zValidator('json', ContactosInstituicaoSchema), async (c) => {
  const data = c.req.valid('json');
  return c.json({ data: await instituicaoService.update(c.get('user').id, 'contactos', {
    contactosInstitucionais: data.contactos, website: data.website,
  }) });
});
instituicaoRoutes.patch('/me/oferta', zValidator('json', OfertaInstituicaoSchema), async (c) => {
  return c.json({ data: await instituicaoService.update(c.get('user').id, 'oferta', c.req.valid('json')) });
});
instituicaoRoutes.patch('/me/recursos', zValidator('json', RecursosInstituicaoSchema), async (c) => {
  const data = c.req.valid('json');
  return c.json({ data: await instituicaoService.update(c.get('user').id, 'recursos', {
    estatisticas: {
      numeroEstudantes: data.numeroEstudantes,
      numeroDocentes: data.numeroDocentes,
      numeroColaboradores: data.numeroColaboradores,
    },
    infraestruturas: data.infraestruturas, acessibilidade: data.acessibilidade,
  }) });
});
instituicaoRoutes.patch('/me/qualidade', zValidator('json', QualidadeInstituicaoSchema), async (c) => {
  const data = c.req.valid('json');
  return c.json({ data: await instituicaoService.update(c.get('user').id, 'qualidade', {
    acreditacoes: [
      ...data.acreditacoes.map(item => ({ ...item, categoria: 'acreditacao' })),
      ...data.certificacoes.map(item => ({ ...item, categoria: 'certificacao' })),
    ],
    politicas: data.politicas,
  }) });
});
instituicaoRoutes.patch('/me/multimedia', zValidator('json', MultimediaInstituicaoSchema), async (c) => {
  return c.json({ data: await instituicaoService.update(c.get('user').id, 'multimedia', c.req.valid('json')) });
});

const documentoTipos = z.enum(['nif', 'alvara', 'estatuto', 'acreditacao', 'representacao', 'outro']);
const DOCUMENTO_MAX_BYTES = 15 * 1024 * 1024;

instituicaoRoutes.post('/me/documentos', async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'];
  const tipo = documentoTipos.safeParse(body['tipo']);
  if (!(file instanceof File) || !tipo.success) return c.json({ error: 'Documento ou tipo inválido' }, 400);
  if (file.size > DOCUMENTO_MAX_BYTES) return c.json({ error: 'Documento excede 15 MB' }, 413);
  const buffer = Buffer.from(await file.arrayBuffer());
  const magic = await validateMagicBytes(buffer, file.type);
  if (!magic.ok) return c.json({ error: magic.reason }, 415);
  const safeName = file.name.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_');
  const storageKey = `private/instituicoes/${c.get('user').id}/${crypto.randomUUID()}-${safeName}`;
  await uploadToR2(storageKey, buffer, file.type);
  const documento = {
    tipo: tipo.data, nome: safeName, storageKey, mimeType: file.type,
    tamanho: file.size, estadoAnalise: 'pending',
  };
  const result = await instituicaoService.appendDocumento(c.get('user').id, documento);
  return c.json({ data: result }, 201);
});

instituicaoRoutes.post('/me/submeter-verificacao', zValidator('json', SubmeterVerificacaoInstituicaoSchema), async (c) => {
  return c.json({ data: await instituicaoService.submeter(c.get('user').id) });
});

instituicaoRoutes.get('/admin/pendentes', checkRole(['super_admin']), async (c) => {
  try {
    const page = Math.max(1, Number.parseInt(c.req.query('page') ?? '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(c.req.query('pageSize') ?? '25', 10) || 25));
    const result = await strapiGet('/instituicoes', {
      'filters[estado][$eq]': 'pending_review',
      'populate[documentosLegais]': '*',
      'pagination[page]': String(page),
      'pagination[pageSize]': String(pageSize),
    });
    return c.json(result);
  } catch (err) {
    log.error({ err }, 'Falha ao carregar instituições pendentes');
    return c.json({ error: 'Falha ao carregar instituições pendentes' }, 502);
  }
});

const moderacaoSchema = z.object({
  estado: z.enum(['verified', 'changes_requested', 'suspended']),
  motivo: z.string().min(10).max(500).optional(),
}).superRefine((data, ctx) => {
  if (data.estado !== 'verified' && !data.motivo) ctx.addIssue({ code: 'custom', message: 'Motivo obrigatório', path: ['motivo'] });
});

instituicaoRoutes.patch('/admin/:id/estado', checkRole(['super_admin']), zValidator('json', moderacaoSchema), async (c) => {
  const body = c.req.valid('json');
  const result = await instituicaoService.moderar(c.req.param('id'), c.get('user').id, body.estado, body.motivo);
  return c.json({ data: result });
});
