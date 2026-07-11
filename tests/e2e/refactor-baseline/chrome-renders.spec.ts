import { test, expect } from '../../helpers/fixtures';
import type { Page } from '@playwright/test';

test.describe('Chrome Refactor Baseline', () => {
  const validateLayout = async (page: Page) => {
    await page.goto('/app/home', { waitUntil: 'domcontentloaded' });

    // TopBar
    await expect(page.getByTestId('topbar')).toBeVisible({ timeout: 15_000 });

    // Sidebar
    await expect(page.locator('nav')).toBeVisible({ timeout: 15_000 });
    
    // User Menu (RoleChipMenu)
    const userMenu = page.getByTestId('user-menu');
    await expect(userMenu).toBeVisible({ timeout: 15_000 });
  };

  test('deve renderizar Sidebar e TopBar correctamente para estudante', async ({ estudantePage: page }) => {
    await validateLayout(page);
  });

  test('deve renderizar Sidebar e TopBar correctamente para mentor', async ({ mentorPage: page }) => {
    await validateLayout(page);
  });

  test('deve renderizar Sidebar e TopBar correctamente para instituição', async ({ instituicaoPage: page }) => {
    await validateLayout(page);
  });

  test('deve renderizar Sidebar e TopBar correctamente para moderador', async ({ moderadorPage: page }) => {
    await validateLayout(page);
  });

  test('deve renderizar Sidebar e TopBar correctamente para comité', async ({ comiteCientificoPage: page }) => {
    await validateLayout(page);
  });

  test('deve renderizar Sidebar e TopBar correctamente para admin', async ({ adminPage: page }) => {
    await validateLayout(page);
  });

  test('deve migrar localStorage de pdc-theme para pdc:theme', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('pdc-theme', 'light');
    });
    
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => (
      localStorage.getItem('pdc:theme') === 'light'
      && localStorage.getItem('pdc-theme') === null
    ));
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
