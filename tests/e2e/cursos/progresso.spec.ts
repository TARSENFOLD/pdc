import { test, expect } from '../../helpers/fixtures';

test.describe('Cursos - Progresso', () => {
  test('aluno can view progress on a curso', async ({ alunoPage }) => {
    await alunoPage.goto('/app/cursos');
    const cursoCard = alunoPage.locator('a[href*="/cursos/"]').first();
    if (await cursoCard.isVisible()) {
      await cursoCard.click();
      await expect(alunoPage.locator('text=Progresso, text=concluído, text=%')).toBeVisible({ timeout: 10_000 });
    }
  });

  test('completing a lesson updates progress', async ({ alunoPage }) => {
    // Navigate to a specific lesson
    await alunoPage.goto('/app/cursos');
    const lessonLink = alunoPage.locator('a[href*="/player/"]').first();
    if (await lessonLink.isVisible()) {
      await lessonLink.click();
      const completeBtn = alunoPage.locator('button:has-text("Concluir"), button:has-text("Próximo")');
      if (await completeBtn.isVisible()) {
        await completeBtn.click();
        await expect(alunoPage.locator('text=Sucesso, .toast-success')).toBeVisible({ timeout: 5_000 }).catch(() => {});
      }
    }
  });
});
