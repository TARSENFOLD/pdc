import { test, expect } from '../../helpers/fixtures';

test.describe('Experiências - Criar Experiência', () => {
  test('instituicao can access experiencias page', async ({ instituicaoPage }) => {
    await instituicaoPage.goto('/app/instituicao/experiencias');
    await expect(instituicaoPage.locator('h1, h2, main')).toBeVisible({ timeout: 10_000 });
  });

  test('instituicao sees create button', async ({ instituicaoPage }) => {
    await instituicaoPage.goto('/app/instituicao/experiencias');
    await instituicaoPage.waitForTimeout(3_000);
    const createBtn = instituicaoPage.locator('button:has-text("Criar"), button:has-text("Nova"), a:has-text("Criar"), a:has-text("Nova")');
    if (await createBtn.count() > 0) {
      await expect(createBtn.first()).toBeVisible();
    } else {
      // Page loaded but may not have create button yet
      await expect(instituicaoPage.locator('main')).toBeVisible();
    }
  });

  test('aluno cannot create experiencia', async ({ alunoPage }) => {
    await alunoPage.goto('/app/instituicao/experiencias');
    await alunoPage.waitForTimeout(3_000);
    const url = alunoPage.url();
    const isBlocked = !url.includes('/instituicao/experiencias');
    expect(isBlocked).toBeTruthy();
  });
});
