import { test, expect } from '../../helpers/fixtures';

test.describe('Perfil - Editar Perfil', () => {
  test('aluno can edit their profile', async ({ alunoPage }) => {
    await alunoPage.goto('/app/perfil/editar');
    await expect(alunoPage.locator('form')).toBeVisible({ timeout: 10_000 });

    const newName = `Nome ${Date.now()}`;
    await alunoPage.fill('input[name="name"], input[name="nome"]', newName);
    await alunoPage.click('button[type="submit"]');

    await expect(alunoPage.locator('text=Sucesso, text=atualizado')).toBeVisible({ timeout: 10_000 });
    await alunoPage.goto('/app/perfil');
    await expect(alunoPage.locator(`text=${newName}`)).toBeVisible();
  });

  test('aluno can change their bio', async ({ alunoPage }) => {
    await alunoPage.goto('/app/perfil/editar');
    const newBio = `Bio de teste ${Date.now()}`;
    await alunoPage.fill('textarea[name="bio"]', newBio);
    await alunoPage.click('button[type="submit"]');

    await expect(alunoPage.locator('text=Sucesso')).toBeVisible({ timeout: 5_000 });
  });
});
