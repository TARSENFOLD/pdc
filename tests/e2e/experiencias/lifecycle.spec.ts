import { test, expect } from '../../helpers/fixtures';
import type { Page } from '@playwright/test';
import { z } from 'zod';
import path from 'node:path';

const API = 'http://localhost:3001';
const STRAPI = process.env.STRAPI_URL ?? 'http://127.0.0.1:1337';
const token = process.env.STRAPI_API_TOKEN ?? 'test-strapi-token';
const entity = z.object({
  id: z.union([z.string(), z.number()]),
  documentId: z.string().optional(),
});
const flagsSchema = z.object({
  data: z.array(entity.extend({ domain: z.string(), enabled: z.boolean() })),
});
const savedFlags: Array<{ domain: string; enabled: boolean }> = [];

test.describe('Experiências e VWX — ciclo real', () => {
  test.describe.configure({ mode: 'serial', timeout: 180000 });
  test.beforeAll(async ({ request, browser }) => {
    const admin = await browser.newContext({
      storageState: path.resolve('tests/.auth/super_admin.json'),
    });
    try {
      const response = await request.get(`${STRAPI}/api/feature-flags`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(response).toBeOK();
      const flags = flagsSchema.parse(await response.json()).data;
      for (const domain of ['content_submission_enabled', 'vwx_catalog_enabled']) {
        const flag = flags.find((value) => value.domain === domain);
        expect(flag, domain).toBeDefined();
        if (!flag) throw new Error(`Flag ausente: ${domain}`);
        savedFlags.push({ domain, enabled: flag.enabled });
        expect(
          await admin.request.put(`${API}/feature-flags/defaults/${domain}`, {
            data: { enabled: true },
          })
        ).toBeOK();
      }
    } finally {
      await admin.close();
    }
  });
  test.afterAll(async ({ browser }) => {
    const admin = await browser.newContext({
      storageState: path.resolve('tests/.auth/super_admin.json'),
    });
    try {
      for (const flag of savedFlags)
        expect(
          await admin.request.put(`${API}/feature-flags/defaults/${flag.domain}`, {
            data: { enabled: flag.enabled },
          })
        ).toBeOK();
    } finally {
      await admin.close();
    }
  });

  async function createAndPublish(page: Page, vwx: boolean) {
    const title = `${vwx ? 'VWX' : 'Experiência'} E2E ${Date.now()}`;
    await page.goto(`/app/instituicao/criar-experiencia${vwx ? '?tipo=vwx' : ''}`);
    await page.locator('input[name="titulo"]').fill(title);
    await page
      .getByLabel('Descrição narrativa')
      .fill(
        'Conteúdo de teste identificado para verificar criação, publicação e participação reais.'
      );
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({
        name: 'capa-e2e.png',
        mimeType: 'image/png',
        buffer: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5N8AAAAASUVORK5CYII=',
          'base64'
        ),
      });
    await expect(page.getByAltText('Capa', { exact: true })).toBeVisible();
    if (vwx) {
      await page.getByLabel('Profissão ou função').fill('Analista de produto');
      await page.getByLabel('Entidade parceira', { exact: true }).fill('Parceiro fictício E2E');
      await page
        .getByLabel('O que o participante irá produzir')
        .fill('Um diagnóstico fundamentado de uma jornada de utilizador.');
      await expect(page.getByRole('button', { name: /^Realidade/ })).toHaveCount(0);
    }
    await page
      .getByRole('button', { name: vwx ? /Percurso profissional/ : /Storytelling/ })
      .click();
    for (let index = 0; index < (vwx ? 7 : 6); index++) {
      await page.getByRole('button', { name: 'Editar', exact: true }).nth(index).click();
      await page
        .getByLabel('Conteúdo', { exact: true })
        .fill(
          `Etapa ${index + 1}: analisa o contexto apresentado, identifica evidências e justifica as tuas decisões.`
        );
      await page.getByRole('button', { name: 'Voltar aos módulos' }).click();
    }
    await page.getByRole('button', { name: 'Guardar rascunho', exact: true }).click();
    await expect(page).toHaveURL(/editar-experiencia\//);
    const id = page.url().split('/').at(-1);
    if (!id) throw new Error('ID de rascunho ausente');
    await page.reload();
    await expect(page.locator('input[name="titulo"]')).toHaveValue(title);
    await expect(page.getByAltText('Capa', { exact: true })).toBeVisible();
    const draft = await page.request.get(`${API}/experiencias/minhas/${id}`);
    expect(draft).toBeOK();
    const stored = z
      .object({
        slug: z.string(),
        capaUrl: z.string().url(),
        tipoExperiencia: z.string(),
        secoes: z.array(z.object({ id: z.string() })),
      })
      .parse(await draft.json());
    expect(await page.request.get(stored.capaUrl)).toBeOK();
    expect(stored.tipoExperiencia).toBe(vwx ? 'vwx' : 'institucional');
    const privateResponse = await page.request.get(`${API}/experiencias/${stored.slug}`);
    expect(privateResponse.status()).toBe(404);
    if (vwx) {
      await page.getByRole('button', { name: /Validação do parceiro/ }).click();
      await page.getByLabel('Responsável pela validação').fill('Responsável E2E');
      await page
        .getByLabel('Referência da aprovação')
        .fill('Validação fictícia exclusiva do teste automatizado.');
      await page.getByRole('button', { name: 'Registar validação' }).click();
      await expect(page.getByText('Validação registada por Responsável E2E.')).toBeVisible();
    }
    await page.getByRole('button', { name: 'Submeter para revisão' }).click();
    await expect(page.getByRole('button', { name: 'Aprovar conteúdo' })).toBeVisible();
    await page.getByRole('button', { name: 'Aprovar conteúdo' }).click();
    await page.getByRole('button', { name: 'Publicar agora' }).click();
    await expect(page.getByRole('link', { name: 'Abrir página pública' })).toBeVisible();
    const outbox = await page.request.get(
      `${STRAPI}/api/domain-events?filters[name][$eq]=experiencia.publicada&sort=createdAt:desc&pagination[pageSize]=100`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    expect(outbox).toBeOK();
    const events = z
      .object({ data: z.array(z.object({ payload: z.object({ experienciaId: z.string() }) })) })
      .parse(await outbox.json());
    expect(events.data.some((event) => event.payload.experienciaId === id)).toBe(true);
    return { id, title, ...stored };
  }

  test('Experiência: criar, guardar, reabrir, publicar, descobrir por slug e participar', async ({
    adminPage,
    alunoPage,
  }, info) => {
    const content = await createAndPublish(adminPage, false);
    await alunoPage.goto(`/experiencias?tipo=institucional&q=${encodeURIComponent(content.title)}`);
    await alunoPage.getByRole('link', { name: `Ver experiência: ${content.title}` }).click();
    await expect(alunoPage.getByRole('heading', { name: content.title })).toBeVisible();
    await alunoPage.getByRole('button', { name: 'Participar', exact: true }).click();
    await expect(alunoPage.getByRole('button', { name: 'Já estás a participar' })).toBeVisible();
    await alunoPage.reload();
    await expect(alunoPage.getByRole('button', { name: 'Já estás a participar' })).toBeVisible();
    await expect(alunoPage.getByLabel('O teu entregável')).toHaveCount(0);
    await alunoPage.screenshot({
      path: info.outputPath('experiencia-desktop.png'),
      fullPage: true,
    });
    await alunoPage.setViewportSize({ width: 390, height: 844 });
    expect(
      await alunoPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true);
    await alunoPage.screenshot({ path: info.outputPath('experiencia-mobile.png'), fullPage: true });
  });

  test('VWX: percurso completo, entrega privada, retoma e conclusão', async ({
    adminPage,
    alunoPage,
    mentorPage,
  }, info) => {
    const content = await createAndPublish(adminPage, true);
    const publicResponse = await alunoPage.request.get(`${API}/experiencias/${content.slug}`);
    expect(publicResponse).toBeOK();
    expect(await publicResponse.json()).not.toHaveProperty('vwxValidacao');
    await alunoPage.goto(`/experiencias?tipo=vwx&q=${encodeURIComponent(content.title)}`);
    await alunoPage.getByRole('link', { name: `Ver experiência: ${content.title}` }).click();
    await alunoPage.getByRole('button', { name: 'Iniciar VWX', exact: true }).click();
    const panel = alunoPage.getByRole('region', { name: 'A minha participação VWX' });
    await expect(panel).toBeVisible();
    await panel.getByRole('checkbox').first().check();
    await panel
      .getByLabel('O teu entregável')
      .fill('Resultado privado: diagnóstico da jornada com três evidências.');
    await panel.getByRole('button', { name: 'Guardar progresso' }).click();
    await expect(panel.getByRole('status')).toHaveText('Progresso guardado.');
    await alunoPage.reload();
    await expect(panel.getByRole('checkbox').first()).toBeChecked();
    await expect(panel.getByLabel('O teu entregável')).toHaveValue(
      'Resultado privado: diagnóstico da jornada com três evidências.'
    );
    const other = await mentorPage.request.get(`${API}/experiencias/${content.id}/participacao`);
    expect(other).toBeOK();
    expect(await other.json()).toMatchObject({ participacao: null });
    for (const checkbox of await panel.getByRole('checkbox').all()) await checkbox.check();
    await panel
      .getByLabel('Reflexão final')
      .fill('Aprendi a justificar decisões a partir de evidências concretas.');
    await panel.getByRole('button', { name: 'Concluir VWX', exact: true }).click();
    await expect(panel.getByRole('heading', { name: 'VWX concluída' })).toBeVisible();
    await alunoPage.reload();
    await expect(panel.getByRole('heading', { name: 'VWX concluída' })).toBeVisible();
    await alunoPage.setViewportSize({ width: 390, height: 844 });
    expect(
      await alunoPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true);
    await alunoPage.screenshot({ path: info.outputPath('vwx-mobile.png'), fullPage: true });
  });
});
