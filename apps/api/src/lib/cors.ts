import type { Context } from 'hono';
import { env } from './env.js';

export const ALLOWED_ORIGINS = env.NODE_ENV === 'production'
  ? ['https://usepdc.com', 'https://www.usepdc.com']
  : [env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:5174', 'capacitor://localhost', 'ionic://localhost'];

export function applyCorsHeaders(c: Context): void {
  const origin = c.req.header('Origin');
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Access-Control-Allow-Credentials', 'true');
    c.header('Vary', 'Origin');
  }
}
