import { test, expect } from '../../helpers/fixtures';

test.describe('Chrome Refactor Baseline', () => {
  const validateLayout = async (page: any, role: string) => {
    await page.goto('/app/home');

    // Sidebar
    await expect(page.locator('nav')).toBeVisible();
    
    // TopBar
    await expect(page.getByTestId('topbar')).toBeVisible();
    
    // User Menu (RoleChipMenu)
    const userMenu = page.getByTestId('user-menu');
    await expect(userMenu).toBeVisible();
  };

  test('deve renderizar Sidebar e TopBar correctamente para estudante', async ({ estudantePage: page }) => {
    await validateLayout(page, 'estudante');
  });

  test('deve renderizar Sidebar e TopBar correctamente para mentor', async ({ mentorPage: page }) => {
    await validateLayout(page, 'mentor');
  });

  test('deve renderizar Sidebar e TopBar correctamente para instituição', async ({ instituicaoPage: page }) => {
    await validateLayout(page, 'instituicao');
  });

  test('deve renderizar Sidebar e TopBar correctamente para moderador', async ({ moderadorPage: page }) => {
    await validateLayout(page, 'moderador');
  });

  test('deve renderizar Sidebar e TopBar correctamente para comité', async ({ comiteCientificoPage: page }) => {
    await validateLayout(page, 'comite_cientifico');
  });

  test('deve renderizar Sidebar e TopBar correctamente para admin', async ({ adminPage: page }) => {
    await validateLayout(page, 'super_admin');
  });

  test('deve migrar localStorage de pdc-theme para pdc:theme', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('pdc-theme', 'light');
    });
    
    await page.goto('/');
    
    const theme = await page.evaluate(() => localStorage.getItem('pdc:theme'));
    const legacyTheme = await page.evaluate(() => localStorage.getItem('pdc-theme'));
    
    expect(theme).toBe('light');
    expect(legacyTheme).toBeNull();
  });

  test('deve alternar idioma e persistir em pdc:locale', async ({ estudantePage: page }) => {
    await page.goto('/app/home');
    
    // Abrir menu e trocar para Inglês
    await page.getByTestId('user-menu').click();
    await page.getByRole('button', { name: /english/i }).click();
    
    // Validar persistência
    const locale = await page.evaluate(() => localStorage.getItem('pdc:locale'));
    expect(locale).toBe('en');
    
    // Validar alteração na UI (ex: Início -> Home na Sidebar)
    await expect(page.locator('nav')).toContainText('Home');
  });
});
