import { Hono } from 'hono';
import { z } from 'zod';
import { legalService } from '../modules/legal/legal.service.js';

export const legalRoutes = new Hono();

const legalSlugSchema = z.string().min(1).max(80).regex(/^[a-z0-9-]+$/);

legalRoutes.get('/:slug', async (c) => {
  const parsedSlug = legalSlugSchema.safeParse(c.req.param('slug'));
  if (!parsedSlug.success) {
    return c.json({ error: 'Documento legal inválido' }, 400);
  }

  const document = await legalService.findPublishedBySlug(parsedSlug.data);
  if (!document) {
    return c.json({ error: 'Documento legal não encontrado' }, 404);
  }

  return c.json(document);
});
