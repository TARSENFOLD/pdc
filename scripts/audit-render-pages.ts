import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium, type BrowserContext, type Page, type ConsoleMessage } from '@playwright/test';

type Role = 'aluno' | 'mentor' | 'instituicao' | 'moderador' | 'comite_cientifico' | 'super_admin';

interface AuditRoute {
  path: string;
  role?: Role;
  label: string;
}

interface AuditResult {
  path: string;
  role: Role | 'public';
  label: string;
  finalUrl: string;
  status: 'ok' | 'system-error' | 'not-found' | 'blank' | 'crashed' | 'degraded';
  heading: string;
  buttons: number;
  links: number;
  cards: number;
  catalogItems: number;
  errorText: string;
  consoleErrors: string[];
}

const BASE_URL = process.env.AUDIT_BASE_URL ?? 'http://localhost:5173';
const API_URL = process.env.AUDIT_API_URL ?? 'http://localhost:3001';
const TODAY = new Date().toISOString().slice(0, 10);
const OUT = path.resolve(`docs/audit/render-audit-${TODAY}.md`);
const AUDIT_TEST_PASSWORD = process.env.AUDIT_TEST_PASSWORD ?? 'password123';
// Allow time for async UI updates after networkidle
const POST_LOAD_DELAY_MS = 600;

const publicRoutes: AuditRoute[] = [
  { path: '/', label: 'Landing' },
  { path: '/login', label: 'Login' },
  { path: '/forgot-password', label: 'Recuperação de password' },
  { path: '/criar-conta', label: 'Escolha de conta' },
  { path: '/criar-conta/estudante', label: 'Registo estudante' },
  { path: '/criar-conta/mentor', label: 'Registo mentor' },
  { path: '/criar-conta/instituicao', label: 'Registo instituição' },
  { path: '/explorar', label: 'Explorar público' },
  { path: '/cursos', label: 'Cursos público' },
  { path: '/simulacoes', label: 'Simulações público' },
  { path: '/mentores', label: 'Mentores público' },
  { path: '/programas', label: 'Programas público' },
  { path: '/instituicoes', label: 'Instituições público' },
  { path: '/experiencias', label: 'Experiências público' },
  { path: '/termos', label: 'Termos' },
  { path: '/privacidade', label: 'Privacidade' },
];

const appRoutes: AuditRoute[] = [
  { path: '/app/home', role: 'aluno', label: 'Home estudante' },
  { path: '/app/dashboard/estudante', role: 'aluno', label: 'Dashboard estudante' },
  { path: '/app/feed', role: 'aluno', label: 'Feed' },
  { path: '/app/cursos', role: 'aluno', label: 'Cursos app' },
  { path: '/app/simulacoes', role: 'aluno', label: 'Simulações app' },
  { path: '/app/experiencias', role: 'aluno', label: 'Experiências app' },
  { path: '/app/programas', role: 'aluno', label: 'Programas app' },
  { path: '/app/explorar', role: 'aluno', label: 'Explorar app' },
  { path: '/app/perfil', role: 'aluno', label: 'Perfil próprio' },
  { path: '/app/configuracoes', role: 'aluno', label: 'Configurações' },
  { path: '/app/mentorias', role: 'aluno', label: 'Mentorias' },
  { path: '/app/conquistas', role: 'aluno', label: 'Conquistas' },
  { path: '/app/meus-cursos', role: 'aluno', label: 'Meus cursos' },
  { path: '/app/guardados', role: 'aluno', label: 'Guardados' },
  { path: '/app/certificados', role: 'aluno', label: 'Certificados' },
  { path: '/app/ranking', role: 'aluno', label: 'Ranking' },
  { path: '/app/reputacao', role: 'aluno', label: 'Reputação' },
  { path: '/app/vinculos', role: 'aluno', label: 'Vínculos' },
  { path: '/app/mensagens', role: 'aluno', label: 'Mensagens' },
  { path: '/app/perfil-vocacional', role: 'aluno', label: 'Relatório vocacional' },
  { path: '/app/dashboard/mentor', role: 'mentor', label: 'Dashboard mentor' },
  { path: '/app/mentor/cursos', role: 'mentor', label: 'Mentor cursos' },
  { path: '/app/mentor/cursos/criar', role: 'mentor', label: 'Criar curso' },
  { path: '/app/mentor/simulacoes', role: 'mentor', label: 'Mentor simulações' },
  { path: '/app/mentor/simulacoes/criar', role: 'mentor', label: 'Criar simulação' },
  { path: '/app/mentor/upload', role: 'mentor', label: 'Upload mentor' },
  { path: '/app/mentor/estudantes/inscritos', role: 'mentor', label: 'Estudantes inscritos' },
  { path: '/app/mentor/mentorados', role: 'mentor', label: 'Mentorados' },
  { path: '/app/mentor/analytics', role: 'mentor', label: 'Analytics mentor' },
  { path: '/app/dashboard/instituicao', role: 'instituicao', label: 'Dashboard instituição' },
  { path: '/app/instituicao/experiencias', role: 'instituicao', label: 'Instituição experiências' },
  { path: '/app/instituicao/criar-experiencia', role: 'instituicao', label: 'Criar experiência' },
  { path: '/app/instituicao/programas', role: 'instituicao', label: 'Instituição programas' },
  { path: '/app/instituicao/criar-programa', role: 'instituicao', label: 'Criar programa' },
  { path: '/app/instituicao/estudantes-vinculados', role: 'instituicao', label: 'Estudantes vinculados' },
  { path: '/app/instituicao/propostas', role: 'instituicao', label: 'Propostas instituição' },
  { path: '/app/instituicao/relatorios', role: 'instituicao', label: 'Relatórios instituição' },
  { path: '/app/instituicao/branding', role: 'instituicao', label: 'Branding instituição' },
  { path: '/app/dashboard/moderador', role: 'moderador', label: 'Dashboard moderador' },
  { path: '/app/moderacao/denuncias', role: 'moderador', label: 'Denúncias' },
  { path: '/app/moderacao/aprovacoes', role: 'moderador', label: 'Aprovações' },
  { path: '/app/moderador/utilizadores', role: 'moderador', label: 'Utilizadores moderador' },
  { path: '/app/dashboard/comite', role: 'comite_cientifico', label: 'Dashboard comité' },
  { path: '/app/comite/validacao', role: 'comite_cientifico', label: 'Validação científica' },
  { path: '/app/dashboard/admin', role: 'super_admin', label: 'Dashboard admin' },
  { path: '/app/admin/utilizadores', role: 'super_admin', label: 'Admin utilizadores' },
  { path: '/app/admin/stats', role: 'super_admin', label: 'Admin stats' },
  { path: '/app/admin/audit', role: 'super_admin', label: 'Admin audit' },
  { path: '/app/admin/lti', role: 'super_admin', label: 'Admin LTI' },
  { path: '/app/admin/feed-weights', role: 'super_admin', label: 'Admin feed weights' },
  { path: '/app/admin/telemetria', role: 'super_admin', label: 'Admin telemetria' },
  { path: '/app/admin/relatorios', role: 'super_admin', label: 'Admin relatórios' },
  { path: '/app/admin/feature-flags', role: 'super_admin', label: 'Admin feature flags' },
];

async function authenticate(context: BrowserContext, role: Role): Promise<void> {
  const response = await context.request.post(`${API_URL}/auth/login`, {
    data: { email: `${role}@traycer.test`, password: AUDIT_TEST_PASSWORD },
  });
  if (!response.ok()) {
    throw new Error(`Login falhou para ${role}: ${response.status()}`);
  }
}

async function visibleCount(page: Page, selector: string): Promise<number> {
  return page.locator(selector).evaluateAll((nodes) =>
    nodes.filter((node) => {
      if (!(node instanceof HTMLElement)) return false;
      const rect = node.getBoundingClientRect();
      const style = window.getComputedStyle(node);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    }).length
  );
}

async function auditPage(page: Page, route: AuditRoute, role: Role | 'public'): Promise<AuditResult> {
  const consoleErrors: string[] = [];
  const onConsole = (msg: ConsoleMessage): void => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 240));
  };
  const onPageError = (error: Error): void => {
    consoleErrors.push(error.message.slice(0, 240));
  };
  page.on('console', onConsole);
  page.on('pageerror', onPageError);

  try {
    await page.goto(route.path, { waitUntil: 'networkidle', timeout: 20_000 });
    await page.waitForTimeout(POST_LOAD_DELAY_MS);
    const systemError = await page.getByText('Ocorreu um erro sistémico').count();
    const notFound = await page.locator('h1, h2').filter({ hasText: /^404$/ }).count();
    const bodyText = (await page.locator('body').innerText({ timeout: 2_000 }).catch(() => '')).trim();
    const heading = await page.locator('h1, h2, [data-testid="page-hero-title"]').first().innerText({ timeout: 1_500 }).catch(() => '');
    const hasServerError = consoleErrors.some(e => /status.*5\d{2}|FetchError|50[0-9]/.test(e));
    const status = systemError > 0
      ? 'system-error'
      : notFound > 0
        ? 'not-found'
        : bodyText.length < 20
          ? 'blank'
          : hasServerError
            ? 'degraded'
            : 'ok';

    return {
      path: route.path,
      role,
      label: route.label,
      finalUrl: page.url().replace(BASE_URL, ''),
      status,
      heading: heading.replace(/\s+/g, ' ').slice(0, 100),
      buttons: await visibleCount(page, 'button, [role="button"]'),
      links: await visibleCount(page, 'a[href]'),
      cards: await visibleCount(page, 'article, [data-testid*="card"], [class*="rounded"][class*="border"]'),
      catalogItems: await visibleCount(page, '[data-testid="catalogo"] a[href], [data-testid*="curso-card"], [data-testid*="content-card"]'),
      errorText: systemError > 0 ? bodyText.slice(0, 240).replace(/\s+/g, ' ') : '',
      consoleErrors: [...new Set(consoleErrors)].slice(0, 4),
    };
  } catch (error) {
    return {
      path: route.path,
      role,
      label: route.label,
      finalUrl: page.url().replace(BASE_URL, ''),
      status: 'crashed',
      heading: '',
      buttons: 0,
      links: 0,
      cards: 0,
      catalogItems: 0,
      errorText: error instanceof Error ? error.message : String(error),
      consoleErrors: [...new Set(consoleErrors)].slice(0, 4),
    };
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
  }
}

function renderMarkdown(results: AuditResult[]): string {
  const totals = results.reduce<Record<string, number>>((acc, result) => {
    acc[result.status] = (acc[result.status] ?? 0) + 1;
    return acc;
  }, {});
  const lines = [
    '# Auditoria de Renderização — Shell e Páginas',
    '',
    `Data: ${TODAY}`,
    `Base URL: ${BASE_URL}`,
    '',
    `Resumo: ${results.length} rotas auditadas · OK ${totals.ok ?? 0} · Degraded ${totals.degraded ?? 0} · Erro sistémico ${totals['system-error'] ?? 0} · 404 ${totals['not-found'] ?? 0} · Blank ${totals.blank ?? 0} · Crash ${totals.crashed ?? 0}`,
    '',
    '| Status | Role | Rota | Heading | Botões | Links | Cards | Itens catálogo | Erro |',
    '|---|---|---|---|---:|---:|---:|---:|---|',
  ];

  for (const result of results) {
    lines.push([
      result.status,
      result.role,
      result.finalUrl || result.path,
      result.heading || '-',
      String(result.buttons),
      String(result.links),
      String(result.cards),
      String(result.catalogItems),
      result.errorText || result.consoleErrors.join(' / ') || '-',
    ].map((cell) => ` ${cell.replace(/\|/g, '\\|')} `).join('|'));
  }

  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  const browser = await chromium.launch();
  const results: AuditResult[] = [];

  const publicContext = await browser.newContext({ baseURL: BASE_URL });
  const publicPage = await publicContext.newPage();
  for (const route of publicRoutes) {
    results.push(await auditPage(publicPage, route, 'public'));
  }
  await publicContext.close();

  const contexts = new Map<Role, BrowserContext>();
  for (const route of appRoutes) {
    const role = route.role ?? 'aluno';
    let context = contexts.get(role);
    if (!context) {
      context = await browser.newContext({ baseURL: BASE_URL });
      await authenticate(context, role);
      contexts.set(role, context);
    }
    const page = await context.newPage();
    results.push(await auditPage(page, route, role));
    await page.close();
  }

  for (const context of contexts.values()) await context.close();
  await browser.close();

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, renderMarkdown(results), 'utf8');
  console.log(`Wrote ${OUT}`);
  console.log(renderMarkdown(results));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
