import { test, expect } from '@playwright/test';

// Navigation regression: real router/components with isolated API fixtures.
test.use({ storageState: { cookies: [], origins: [] } });

for (const role of ['mentor', 'instituicao'] as const) {
  test(`${role}: catálogo, cursos criados e inscrições em desktop e mobile`, async ({ page }) => {
    const user = {
      id: 'navigation-user', nome: 'Conta de validação', email: 'navigation@example.test', role,
      createdAt: '2026-09-20T10:00:00Z', updatedAt: '2026-09-20T10:00:00Z',
    };
    const draft = {
      id: 'draft-1', titulo: 'Curso criado por mim', slug: 'rascunho', descricao: 'O meu curso em preparação.',
      autorId: user.id, estado: 'draft', totalHoras: 1,
    };
    const course = { ...draft, id: 'public-1', titulo: 'Curso do catálogo global', estado: 'published', autorId: 'other' };
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('pdc.cookie-consent.v1', JSON.stringify({ choice: 'essential', acceptedAt: '2026-09-20T10:00:00Z' }));
    });
    await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
      const path = new URL(route.request().url()).pathname;
      let body: unknown;
      if (path === '/api/auth/me') body = user;
      else if (path === '/api/bootstrap') body = {
        session: { status: 'authenticated', isAuthenticated: true, user },
        capabilities: { roles: [role], features: { HUB_EXPLORE: true, HUB_MENTOR: true, HUB_INSTITUTION: true, HUB_COMMUNITY: true } },
        security: {}, ux: { theme: 'claro' },
      };
      else if (path === '/api/catalogo/cursos') body = { data: [course], meta: { total: 1, page: 1, pageSize: 12, pageCount: 1 } };
      else if (path === '/api/cursos/meus') body = { data: [draft], pagination: { total: 1, page: 1, pageSize: 25, pageCount: 1 } };
      else if (path === '/api/cursos/me/inscricoes') body = { data: [{
        id: 'enrollment-1', cursoId: course.id, curso: { ...course, titulo: 'Curso que estou a frequentar' },
        dataInscricao: '2026-09-20', progressoPercentual: 40, concluido: false,
      }] };
      else if (path === '/api/notificacoes/contador') body = { count: 0 };
      else { await route.fulfill({ status: 404, json: { error: 'Not part of navigation fixture' } }); return; }
      await route.fulfill({ json: body });
    });

    await page.goto(`/app/${role}/cursos`);
    await expect(page).toHaveURL('/app/cursos', { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Catálogo de cursos' })).toBeVisible();
    await expect(page.getByText('Curso do catálogo global')).toBeVisible();
    await page.getByRole('main').getByRole('link', { name: 'Meus cursos', exact: true }).click();
    await expect(page).toHaveURL(`/app/${role}/meus-cursos`);
    await expect(page.getByText('Curso criado por mim')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Editar', exact: true })).toHaveAttribute('href', `/app/${role}/cursos/draft-1/editar`);
    await page.getByRole('link', { name: 'A frequentar', exact: true }).click();
    await expect(page.getByText('Curso que estou a frequentar')).toBeVisible();
    await expect(page.getByText('40%', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText('Curso que estou a frequentar')).toBeVisible();
    await page.screenshot({ path: test.info().outputPath(`${role}-desktop.png`), fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('link', { name: 'A frequentar', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Criados por mim', exact: true }).click();
    await expect(page.getByText('Curso criado por mim')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
    await page.screenshot({ path: test.info().outputPath(`${role}-mobile.png`), fullPage: true });
    expect(pageErrors).toEqual([]);
  });
}
