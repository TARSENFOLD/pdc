import { test, expect } from '../helpers/fixtures';
import AxeBuilder from '@axe-core/playwright';

test.describe('Acessibilidade (Audit)', () => {
  const publicRoutes = ['/', '/login'];
  const protectedRoutes = ['/app/home'];

  for (const route of publicRoutes) {
    test(`deve passar na auditoria de acessibilidade de ${route} @a11y`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }

  test.describe('Interação e Chrome', () => {
    test('deve permitir navegação por teclado no menu de utilizador @a11y', async ({ estudantePage: page }) => {
      await page.goto('/app/home');
      
      // Abrir menu
      const userMenu = page.getByTestId('user-menu');
      await userMenu.focus();
      await page.keyboard.press('Enter');
      
      // Validar que o menu abriu (aria-expanded)
      await expect(userMenu).toHaveAttribute('aria-expanded', 'true');
      
      // Navegar para "O meu Perfil"
      await page.keyboard.press('Tab');
      const profileLink = page.getByRole('menuitem', { name: /perfil/i });
      await expect(profileLink).toBeFocused();
      
      // Fechar com Escape
      await page.keyboard.press('Escape');
      await expect(userMenu).toHaveAttribute('aria-expanded', 'false');
    });

    test('deve passar na auditoria axe com menu aberto @a11y', async ({ estudantePage: page }) => {
      await page.goto('/app/home');
      await page.getByTestId('user-menu').click();
      
      const results = await new AxeBuilder({ page })
        .include('[role="menu"]')
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      expect(results.violations).toEqual([]);
    });

    test('deve garantir touch targets >= 44px no chrome @a11y', async ({ estudantePage: page }) => {
      await page.goto('/app/home');
      
      // Verificar botões da TopBar e Sidebar
      const buttons = await page.locator('header button, nav button, nav a').all();
      for (const btn of buttons) {
        const box = await btn.boundingBox();
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    });
  });
});
