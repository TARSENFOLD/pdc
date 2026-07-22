import { test, expect } from '../../helpers/fixtures';

test.describe('Experiências - Inscrição', () => {
  test('aluno can browse experiencias', async ({ alunoPage }) => {
    await alunoPage.goto('/app/experiencias');
    await expect(alunoPage.getByRole('main', { name: 'Lista de experiências' })).toBeVisible({ timeout: 10_000 });
  });

  test('experiencias page renders available items or the empty state', async ({ alunoPage }) => {
    await alunoPage.goto('/app/experiencias');
    const listRegion = alunoPage.getByRole('main', { name: 'Lista de experiências' });
    await expect(listRegion).toBeVisible();
    const contentState = listRegion.locator(
      '[aria-label="Experiências disponíveis"], [data-testid="experiencias-empty"]',
    );
    await expect(contentState).toHaveCount(1);
    await expect(contentState.first()).toBeVisible();
  });
});
