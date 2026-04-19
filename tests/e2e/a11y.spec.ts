import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Acessibilidade (Audit)', () => {
  test('deve passar na auditoria de acessibilidade da página inicial @a11y', async ({ page }) => {
    await page.goto('/');

    // Aguarda o carregamento inicial (ex: Spinner)
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Em W0, o teste deve falhar para que o CI sinalize warning (via continue-on-error).
    // O endurecimento para erro bloqueante (remover continue-on-error no CI) será feito em W3-T4.
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
