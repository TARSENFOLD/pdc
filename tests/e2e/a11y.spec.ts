import { test, expect } from '../helpers/fixtures';
import AxeBuilder from '@axe-core/playwright';

test.describe('Acessibilidade (Audit)', () => {
  const publicRoutes = ['/', '/login', '/cursos'];
  const protectedRoutes = ['/app', '/app/dashboard/estudante'];

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

  for (const route of protectedRoutes) {
    test(`deve passar na auditoria de acessibilidade de ${route} (Autenticado) @a11y`, async ({ alunoPage: page }) => {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
