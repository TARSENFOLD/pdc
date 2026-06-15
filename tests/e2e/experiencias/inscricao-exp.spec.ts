import { test, expect } from '../../helpers/fixtures';

test.describe('Experiências - Inscrição', () => {
  test('aluno can browse experiencias', async ({ alunoPage }) => {
    await alunoPage.goto('/app/experiencias');
    await expect(alunoPage.getByRole('main', { name: 'Lista de experiências' })).toBeVisible({ timeout: 10_000 });
  });

  test('experiencias page shows cards or empty state', async ({ alunoPage }) => {
    await alunoPage.goto('/app/experiencias');
    const listRegion = alunoPage.getByRole('main', { name: 'Lista de experiências' });
    await expect(listRegion).toBeVisible();
    await expect(
      listRegion.getByRole('list', { name: 'Experiências disponíveis' }),
    ).toBeVisible();
  });
});
