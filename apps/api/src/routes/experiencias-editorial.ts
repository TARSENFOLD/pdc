import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { VwxValidacaoSchema } from '@pdc/shared';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import {
  requireInternalQaCreatorAccess,
  disabledFeatureResponse,
} from '../modules/feature-flags/cor-0001-gates.js';
import {
  findExperience,
  readinessIssues,
  publishExperience,
} from '../modules/experiencias/experience.service.js';
import { persistedEntityId } from '../modules/strapi/strapi-entity.js';
import { strapiPut } from '../modules/strapi/strapi.client.js';
import { eventBus } from '../modules/events/event-bus.js';
import { DomainEventName } from '../modules/events/types.js';
import { experienceWriteLock } from '../modules/experiencias/experience-write-lock.js';

export const experienciaEditorialRoutes = new Hono<{ Variables: AuthVariables }>();
const roles = ['instituicao', 'mentor', 'comite_cientifico', 'moderador', 'super_admin'] as const;

experienciaEditorialRoutes.post(
  '/:id/validacao-parceiro',
  verifyJwt,
  checkRole(['super_admin']),
  experienceWriteLock,
  zValidator('json', VwxValidacaoSchema.pick({ responsavel: true, referencia: true })),
  async (c) => {
    const existing = await findExperience(c.req.param('id'));
    if (!existing || existing.tipoExperiencia !== 'vwx')
      return c.json({ error: 'VWX não encontrada.' }, 404);
    const issues = readinessIssues(existing);
    if (issues.length)
      return c.json(
        { error: `Completa a VWX antes de registar a validação. ${issues.join('; ')}`, issues },
        422
      );
    const vwxValidacao = {
      ...c.req.valid('json'),
      registadoEm: new Date().toISOString(),
      registadoPor: c.get('user').id,
    };
    await strapiPut(
      `/experiencias/${persistedEntityId(existing)}`,
      { vwxValidacao },
      { status: 'draft' }
    );
    await eventBus.publishWithOutbox(DomainEventName.EXPERIENCIA_ATUALIZADA, {
      experienciaId: persistedEntityId(existing),
      autorId: c.get('user').id,
      titulo: existing.titulo,
    });
    return c.json({ success: true, vwxValidacao });
  }
);

for (const path of ['/:id/submeter', '/:id/estado'] as const) {
  experienciaEditorialRoutes.on(
    ['POST', 'PATCH'],
    path,
    verifyJwt,
    checkRole([...roles]),
    requireInternalQaCreatorAccess(),
    experienceWriteLock,
    zValidator(
      'json',
      z.object({
        motivo: z.string().trim().min(10).max(500).optional(),
        estado: z
          .enum(['draft', 'review', 'approved', 'published', 'rejected', 'archived'])
          .optional(),
      })
    ),
    async (c) => {
      const target = c.req.path.endsWith('/submeter') ? 'review' : c.req.valid('json').estado;
      if (!target) return c.json({ error: 'Estado obrigatório.' }, 400);
      const user = c.get('user');
      const existing = await findExperience(c.req.param('id'));
      if (!existing) return c.json({ error: 'Experiência não encontrada.' }, 404);
      const author = existing.autor?.userId === user.id;
      const admin = user.role === 'super_admin';
      const reviewer = ['comite_cientifico', 'moderador'].includes(user.role);
      const transitions: Record<string, readonly string[]> = {
        draft: ['review'],
        rejected: ['draft'],
        review: ['approved', 'rejected', 'draft'],
        approved: ['published', 'draft'],
        published: ['archived', 'draft'],
        archived: ['draft'],
      };
      const published =
        target === 'archived' ? await findExperience(c.req.param('id'), 'published') : undefined;
      const canArchiveLive = !!published && ['approved', 'published'].includes(published.estado);
      if (!transitions[existing.estado]?.includes(target) && !canArchiveLive) {
        return c.json({ error: `Transição inválida de ${existing.estado} para ${target}.` }, 409);
      }
      const allowed =
        admin ||
        (target === 'approved' || target === 'rejected'
          ? reviewer
          : target === 'archived'
            ? reviewer || author
            : author);
      if (!allowed) return c.json({ error: 'Transição não permitida.' }, 403);
      if (target === 'review') {
        const unavailable = await disabledFeatureResponse(
          c,
          'content_submission_enabled',
          'CONTENT_SUBMISSION_TEMPORARILY_DISABLED',
          user.instituicaoId
        );
        if (unavailable) return unavailable;
      }
      if (['review', 'approved', 'published'].includes(target)) {
        const issues = readinessIssues(existing);
        if (issues.length)
          return c.json(
            { error: `Completa o conteúdo antes de avançar. ${issues.join('; ')}`, issues },
            422
          );
      }
      if (target === 'published' && existing.tipoExperiencia === 'vwx' && !existing.vwxValidacao) {
        return c.json(
          { error: 'Regista a validação da entidade parceira antes de publicar.' },
          422
        );
      }
      const id = persistedEntityId(existing);
      if (target === 'published') {
        await publishExperience(existing);
        await eventBus.publishWithOutbox(DomainEventName.EXPERIENCIA_PUBLICADA, {
          experienciaId: id,
          autorId: existing.autor?.userId ?? user.id,
          titulo: existing.titulo,
        });
      } else {
        const motivo = c.req.valid('json').motivo;
        await strapiPut(
          `/experiencias/${id}`,
          {
            estado: target,
            ...(target === 'rejected' ? { motivoRejeicao: motivo ?? null } : {}),
          },
          { status: 'draft' }
        );
        if (target === 'archived')
          await strapiPut(`/experiencias/${id}`, { estado: target }, { status: 'published' });
        await eventBus.publishWithOutbox(DomainEventName.EXPERIENCIA_ATUALIZADA, {
          experienciaId: id,
          autorId: existing.autor?.userId ?? user.id,
          titulo: existing.titulo,
        });
      }
      return c.json({ success: true });
    }
  );
}
