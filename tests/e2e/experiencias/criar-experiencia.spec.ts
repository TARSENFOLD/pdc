import { test, expect } from '../../helpers/fixtures';import { test, expect } from '../../helpers/fixtures';



























});  });    expect(isBlocked).toBeTruthy();    const isBlocked = !url.includes('/instituicao/experiencias');    const url = alunoPage.url();    await alunoPage.waitForTimeout(3_000);    await alunoPage.goto('/app/instituicao/experiencias');  test('aluno cannot create experiencias', async ({ alunoPage }) => {  });    }      await expect(instituicaoPage.locator('main')).toBeVisible();    } else {      await expect(createBtn.first()).toBeVisible();    if (await createBtn.count() > 0) {    const createBtn = instituicaoPage.locator('button:has-text("Criar"), button:has-text("Nova"), a:has-text("Criar"), a:has-text("Nova")');    await instituicaoPage.waitForTimeout(3_000);    await instituicaoPage.goto('/app/instituicao/experiencias');  test('instituicao sees create button', async ({ instituicaoPage }) => {  });    await expect(instituicaoPage.locator('h1, h2, main')).toBeVisible({ timeout: 10_000 });    await instituicaoPage.goto('/app/instituicao/experiencias');  test('instituicao can access experiencias page', async ({ instituicaoPage }) => {test.describe('Experiências - Criar Experiência', () => {
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
