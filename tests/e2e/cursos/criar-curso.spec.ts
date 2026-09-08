import { test, expect } from '../../helpers/fixtures';
import type { Page } from '@playwright/test';
import { z } from 'zod';

const CreatedCourseSchema = z.object({ documentId: z.string().min(1) });
const EnrollmentSchema = z.object({
  id: z.union([z.string(), z.number()]),
  documentId: z.string().min(1),
});
const STRAPI_URL = process.env.STRAPI_URL ?? 'http://localhost:1337';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

function requireStrapiApiToken(): string {
  if (!STRAPI_API_TOKEN) throw new Error('STRAPI_API_TOKEN é obrigatório para a limpeza E2E');
  return STRAPI_API_TOKEN;
}
const BootstrapFeatureFlagsSchema = z
  .object({
    capabilities: z
      .object({
        features: z.record(z.string(), z.boolean()),
      })
      .passthrough(),
  })
  .passthrough();
const CourseProgressSchema = z.array(
  z.object({
    itemId: z.string(),
    concluido: z.boolean(),
  })
);
const FeatureFlagsResponseSchema = z.object({
  data: z.array(
    z
      .object({
        domain: z.string(),
        enabled: z.boolean(),
      })
      .passthrough()
  ),
});

async function setContentSubmissionFlag(page: Page, enabled: boolean): Promise<void> {
  const response = await page.request.put(
    '/api/feature-flags/defaults/content_submission_enabled',
    { data: { enabled } }
  );
  expect(response.status(), await response.text()).toBe(200);
}

async function withContentSubmissionEnabled(page: Page, run: () => Promise<void>): Promise<void> {
  const response = await page.request.get('/api/feature-flags');
  const responseBody = await response.text();
  expect(response.status(), responseBody).toBe(200);
  const flags = FeatureFlagsResponseSchema.parse(JSON.parse(responseBody));
  const current = flags.data.find(({ domain }) => domain === 'content_submission_enabled');
  if (!current) {
    throw new Error('Feature flag content_submission_enabled não encontrada');
  }

  await setContentSubmissionFlag(page, true);
  try {
    await run();
  } finally {
    await setContentSubmissionFlag(page, current.enabled);
  }
}

test.describe('Criar Curso', () => {
  test.describe.configure({ mode: 'serial' });

  test('não permite avançar enquanto a etapa Básico estiver incompleta', async ({ adminPage }) => {
    await adminPage.goto('/app/mentor/cursos/criar');
    await expect(adminPage.locator('form')).toBeVisible({ timeout: 10_000 });

    await adminPage.getByRole('button', { name: 'Seguinte' }).click();

    await expect(adminPage.getByRole('button', { name: 'Básico' })).toHaveAttribute(
      'aria-current',
      'step'
    );
    await expect(adminPage.getByText('Para concluir esta etapa')).toBeVisible();
    await expect(
      adminPage
        .locator('#info p')
        .getByText('Adiciona um título com pelo menos 3 caracteres.', { exact: true })
    ).toBeVisible();
    await expect(
      adminPage.getByText('A capa é obrigatória para concluir a informação básica.')
    ).toBeVisible();
    await expect(adminPage.getByRole('heading', { name: 'Currículo' })).toHaveCount(0);
  });

  test('QA interno cria e reabre rascunho no RichShell', async ({ adminPage }) => {
    await adminPage.goto('/app/mentor/cursos/criar');
    await expect(adminPage.locator('form')).toBeVisible({ timeout: 10_000 });
    await expect(adminPage.getByRole('navigation', { name: 'Etapas de criação' })).toBeVisible();

    const title = `Curso E2E ${Date.now()}`;
    await adminPage.fill('input[name="titulo"]', title);
    await adminPage.fill(
      'textarea[name="descricao"], input[name="descricao"]',
      'Descrição automática do teste E2E com mais de dez caracteres.'
    );
    await adminPage.selectOption('select[name="area"]', 'TECNOLOGIA');

    const createResponsePromise = adminPage.waitForResponse(
      (response) => response.url().endsWith('/cursos') && response.request().method() === 'POST'
    );
    await adminPage.getByRole('button', { name: 'Guardar rascunho' }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.status()).toBe(201);
    const created = CreatedCourseSchema.parse(await createResponse.json());

    const previewResponsePromise = adminPage.waitForResponse(
      (response) =>
        response.url().includes(`/cursos/${created.documentId}?preview=true`) &&
        response.request().method() === 'GET'
    );
    await adminPage.goto(`/app/mentor/cursos/${created.documentId}/editar`);
    const previewResponse = await previewResponsePromise;
    const previewBody = await previewResponse.text();
    expect(previewResponse.status(), previewBody).toBe(200);
    await expect(adminPage.locator('input[name="titulo"]')).toHaveValue(title);
    await expect(adminPage.locator('select[name="area"]')).toHaveValue('TECNOLOGIA');
  });

  test('QA interno guarda e submete um curso novo diretamente para revisão', async ({
    adminPage,
  }) => {
    await withContentSubmissionEnabled(adminPage, async () => {
      await adminPage.route('**/api/media/upload', async (route) => {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'media-course-cover-e2e',
            url: 'https://images.example.com/curso-submetido-e2e.webp',
            key: 'courses/curso-submetido-e2e.webp',
            filename: 'icon-192.png',
            mimeType: 'image/png',
            size: 413,
          }),
        });
      });
      await adminPage.goto('/app/mentor/cursos/criar');
      await expect(adminPage.locator('form')).toBeVisible({ timeout: 10_000 });

      const title = `Curso submetido E2E ${Date.now()}`;
      await adminPage.fill('input[name="titulo"]', title);
      await adminPage.fill(
        'textarea[name="descricao"]',
        'Curso completo criado pela interface e submetido diretamente para revisão.'
      );
      await adminPage
        .locator('input[type="file"]')
        .first()
        .setInputFiles('apps/web/public/icon-192.png');
      await expect(adminPage.getByText('Mídia materializada com sucesso')).toBeVisible();

      await adminPage.getByRole('button', { name: 'Seguinte' }).click();
      await expect(adminPage.getByRole('heading', { name: 'Currículo' })).toBeVisible();
      await adminPage.fill(
        'textarea[name="modulos.0.itens.0.conteudo"]',
        'Esta aula apresenta os objetivos, desenvolve o tema com exemplos e termina com um próximo passo.'
      );
      await adminPage.getByRole('button', { name: 'Validar e fechar aula' }).click();
      await expect(adminPage.getByRole('button', { name: 'Editar aula' })).toBeVisible();

      await adminPage
        .getByRole('navigation', { name: 'Etapas de criação' })
        .getByRole('button', { name: '4 Revisão' })
        .click();
      const submitButton = adminPage
        .getByRole('button', { name: 'Guardar e submeter para revisão' })
        .last();
      await expect(submitButton).toBeEnabled();

      const createResponsePromise = adminPage.waitForResponse(
        (response) => response.url().endsWith('/cursos') && response.request().method() === 'POST'
      );
      const submitResponsePromise = adminPage.waitForResponse(
        (response) =>
          /\/cursos\/[^/]+\/submeter$/.test(response.url()) &&
          response.request().method() === 'POST'
      );
      await submitButton.click();

      const createResponse = await createResponsePromise;
      const submitResponse = await submitResponsePromise;
      expect(createResponse.status(), await createResponse.text()).toBe(201);
      expect(submitResponse.status(), await submitResponse.text()).toBe(200);
      await expect(adminPage).toHaveURL('/app/instituicao/cursos');
    });
  });

  test('curso atravessa criação, publicação, inscrição, consumo e conclusão', async ({
    adminPage,
    estudantePage,
  }) => {
    const title = `Curso consumível E2E ${Date.now()}`;
    const content =
      'Esta aula comprova que o conteúdo criado chega integralmente ao estudante inscrito.';
    let enrollment: z.infer<typeof EnrollmentSchema> | undefined;
    const createResponse = await adminPage.request.post('/api/cursos', {
      data: {
        titulo: title,
        descricao: 'Percurso completo usado para validar o ciclo funcional do curso.',
        area: 'TECNOLOGIA',
        nivel: 'basico',
        capaUrl: 'https://images.example.com/curso-consumivel-e2e.webp',
        visibilidade: 'publico',
        gratuito: true,
        preco: 0,
        moeda: 'AOA',
        regrasAcesso: { minFluidez: 0, minResiliencia: 0, minFoco: 0 },
        modulos: [
          {
            titulo: 'Módulo funcional',
            ordem: 1,
            itens: [
              {
                titulo: 'Aula funcional',
                tipo: 'texto',
                conteudo: content,
                ordem: 1,
              },
            ],
          },
        ],
      },
    });
    expect(createResponse.status()).toBe(201);
    const created = CreatedCourseSchema.parse(await createResponse.json());

    try {
      const beforePublish = await estudantePage.request.get(`/api/cursos/${created.documentId}`);
      expect(beforePublish.status()).toBe(404);

      const publishResponse = await adminPage.request.patch(
        `/api/cursos/${created.documentId}/estado`,
        {
          data: { estado: 'published' },
        }
      );
      expect(publishResponse.status()).toBe(200);

      const enrollmentResponse = await estudantePage.request.post(
        `/api/cursos/${created.documentId}/inscricao`,
        {
          data: {},
        }
      );
      const enrollmentBody = await enrollmentResponse.text();
      expect(enrollmentResponse.status(), enrollmentBody).toBe(201);
      enrollment = EnrollmentSchema.parse(JSON.parse(enrollmentBody));

      await estudantePage.goto(`/app/cursos/${created.documentId}/interior`);
      await expect(estudantePage.getByRole('heading', { name: title })).toBeVisible({
        timeout: 10_000,
      });
      await estudantePage.getByRole('button', { name: 'Começar' }).click();
      await expect(
        estudantePage.getByRole('heading', { name: 'Aula funcional', level: 2 })
      ).toBeVisible();
      await expect(estudantePage.getByText(content)).toBeVisible();
      const completionResponsePromise = estudantePage.waitForResponse(
        (response) =>
          response.url().includes(`/cursos/${created.documentId}/progresso/`) &&
          response.request().method() === 'PATCH'
      );
      await estudantePage.getByRole('button', { name: 'Concluir', exact: true }).click();
      const completionResponse = await completionResponsePromise;
      expect(completionResponse.status()).toBe(200);

      const progressResponse = await estudantePage.request.get(
        `/api/cursos/${created.documentId}/progresso`
      );
      expect(progressResponse.status()).toBe(200);
      const progress = CourseProgressSchema.parse(await progressResponse.json());
      expect(progress).toEqual([expect.objectContaining({ concluido: true })]);
    } finally {
      if (enrollment) {
        const deleteEnrollmentResponse = await adminPage.request.delete(
          `${STRAPI_URL}/api/inscricoes/${enrollment.documentId}`,
          { headers: { Authorization: `Bearer ${requireStrapiApiToken()}` } }
        );
        expect(
          [200, 204],
          await deleteEnrollmentResponse.text()
        ).toContain(deleteEnrollmentResponse.status());
      }
      const archiveResponse = await adminPage.request.patch(
        `/api/cursos/${created.documentId}/estado`,
        {
          data: { estado: 'archived' },
        }
      );
      expect(archiveResponse.status(), await archiveResponse.text()).toBe(200);
    }
  });

  test('mentor externo vê o gate enquanto o onboarding de criadores está desligado', async ({
    mentorPage,
  }) => {
    await mentorPage.route('**/api/bootstrap', async (route) => {
      const response = await route.fetch();
      const bootstrap = BootstrapFeatureFlagsSchema.parse(await response.json());
      await route.fulfill({
        response,
        json: {
          ...bootstrap,
          capabilities: {
            ...bootstrap.capabilities,
            features: {
              ...bootstrap.capabilities.features,
              external_creator_onboarding_enabled: false,
            },
          },
        },
      });
    });
    await mentorPage.goto('/app/mentor/cursos/criar');
    await expect(mentorPage.getByRole('heading', { name: 'Criar curso' })).toBeVisible();
    await expect(
      mentorPage.getByRole('heading', { name: 'Estúdio temporariamente indisponível' })
    ).toBeVisible();
    await expect(mentorPage.locator('form')).toHaveCount(0);
  });

  test('mentor sees curso list', async ({ mentorPage }) => {
    await mentorPage.goto('/app/mentor/cursos');
    await expect(mentorPage.locator('h1, h2')).toBeVisible({ timeout: 10_000 });
  });

  test('aluno cannot create cursos', async ({ alunoPage }) => {
    await alunoPage.goto('/app/mentor/cursos/criar');
    await expect(alunoPage).not.toHaveURL(/mentor\/cursos\/criar/, { timeout: 5_000 });
  });
});
