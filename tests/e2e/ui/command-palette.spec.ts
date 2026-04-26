import { test, expect } from '../../helpers/fixtures';

/**
 * Command Palette — Refactor Safety Net
 * Valida que a paleta de comandos abre e fecha sem depender de copy específico.
 * Usa data-testid tolerantes a mudanças de texto.
 */
test.describe('Command Palette', () => {
  test('opens via trigger button and can be closed', async ({ alunoPage }) => {
    await alunoPage.goto('/app/home');

    // Aguardar o topbar carregar
    await expect(alunoPage.locator('[data-testid="topbar"]')).toBeVisible({ timeout: 15_000 });

    // Abrir via botão trigger (visível apenas em ecrãs médios+)
    const trigger = alunoPage.locator('[data-testid="command-palette-trigger"]');
    await expect(trigger).toBeVisible();
    await trigger.click();

    // Verificar que a paleta abriu
    await expect(alunoPage.locator('[data-testid="command-palette"]')).toBeVisible({ timeout: 5_000 });

    // Fechar via Escape
    await alunoPage.keyboard.press('Escape');
    await expect(alunoPage.locator('[data-testid="command-palette"]')).not.toBeVisible();
  });

  test('opens via keyboard shortcut Ctrl+K', async ({ alunoPage }) => {
    await alunoPage.goto('/app/home');
    await expect(alunoPage.locator('[data-testid="topbar"]')).toBeVisible({ timeout: 15_000 });

    // Abrir via Ctrl+K ou Meta+K
    const isMac = process.platform === 'darwin';
    await alunoPage.keyboard.press(isMac ? 'Meta+k' : 'Control+k');
    await expect(alunoPage.locator('[data-testid="command-palette"]')).toBeVisible({ timeout: 5_000 });

    // Fechar via Escape
    await alunoPage.keyboard.press('Escape');
    await expect(alunoPage.locator('[data-testid="command-palette"]')).not.toBeVisible();
  });

  test('command palette input accepts search query', async ({ alunoPage }) => {
    await alunoPage.goto('/app/home');
    await expect(alunoPage.locator('[data-testid="topbar"]')).toBeVisible({ timeout: 15_000 });

    await alunoPage.locator('[data-testid="command-palette-trigger"]').click();
    await expect(alunoPage.locator('[data-testid="command-palette"]')).toBeVisible({ timeout: 5_000 });

    const input = alunoPage.locator('[data-testid="command-palette-input"]');
    await expect(input).toBeFocused();
    await input.fill('Feed');

    // Verifica que a lista de resultados ainda renderiza (não interessa o texto)
    await expect(alunoPage.locator('[data-testid="command-palette"] [role="listbox"]')).toBeVisible();
  });
});
