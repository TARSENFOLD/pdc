/**
 * Vercel Edge Middleware for OG bot-safe rendering.
 * 
 * Detects social crawler User-Agents and proxies the request to the BFF
 * /seo/meta endpoint which returns server-rendered HTML with proper OG tags.
 * 
 * Compatible with Vite SPA deployed on Vercel (no Next.js dependency).
 * @see https://vercel.com/docs/functions/edge-middleware
 */

const BOT_UA = /facebookexternalhit|Twitterbot|LinkedInBot|WhatsApp|Slackbot|Discordbot|TelegramBot/i;
const BFF_URL = process.env.BFF_URL ?? 'https://api.usepdc.com';

const PUBLIC_DETAIL_PATHS = /^\/(cursos|simulacoes|mentores|instituicoes|experiencias|projetos|perfil)\//;

export const config = {
  matcher: [
    '/cursos/:path*',
    '/simulacoes/:path*',
    '/mentores/:path*',
    '/instituicoes/:path*',
    '/experiencias/:path*',
    '/projetos/:path*',
    '/perfil/:path*',
  ],
};

export default async function middleware(request: Request): Promise<Response> {
  const ua = request.headers.get('user-agent') ?? '';

  // Only intercept social crawler bots
  if (!BOT_UA.test(ua)) {
    return fetch(request);
  }

  // Check feature flag
  if (process.env.SEO_BOT_RENDER_ENABLED === 'false') {
    return fetch(request);
  }

  const url = new URL(request.url);

  // Only handle public detail pages
  if (!PUBLIC_DETAIL_PATHS.test(url.pathname)) {
    return fetch(request);
  }

  try {
    const metaUrl = `${BFF_URL}/seo/meta?path=${encodeURIComponent(url.pathname)}`;
    const res = await fetch(metaUrl, {
      headers: { 'User-Agent': ua },
      signal: AbortSignal.timeout(3000),
    });

    if (res.ok) {
      const html = await res.text();
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, s-maxage=3600',
        },
      });
    }
  } catch {
    // Fall through to SPA on error
  }

  return fetch(request);
}
