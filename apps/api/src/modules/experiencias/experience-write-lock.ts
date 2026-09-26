import { createMiddleware } from 'hono/factory';
import type { AuthVariables } from '../auth/auth.middleware.js';
import { acquireLock } from '../../lib/distributed-lock.js';
import { CONTENT_ACCESS_ERRORS } from '../conteudo/content-access.service.js';
import { persistedEntityId } from '../strapi/strapi-entity.js';
import { findExperience } from './experience.service.js';

// All editorial writes share the document identity, including slug/numeric aliases.
// Handlers re-read content after acquiring the lock, so an edit cannot race
// partner approval or publish content that was never approved.
export const experienceWriteLock = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const reference = await findExperience(c.req.param('id') ?? '');
    if (!reference) return c.json(CONTENT_ACCESS_ERRORS.content_not_found, 404);
    const lock = await acquireLock(`experiencia:editorial:${persistedEntityId(reference)}`, 120000);
    if (!lock)
      return c.json({ error: 'Este conteúdo está a ser atualizado. Tenta novamente.' }, 409);
    try {
      await next();
    } finally {
      await lock.release();
    }
  }
);
