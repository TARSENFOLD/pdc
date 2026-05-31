import { chromium, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const baseURL = process.env['FRONTEND_URL'] ?? 'http://localhost:5173';
const apiURL = process.env['API_URL'] ?? 'http://localhost:3001';
const password = 'password123';
const courseTitle = `Auditoria Curso UI ${Date.now()}`;

async function loginUi(page: Page, email: string): Promise<void> {
  await page.goto(`${baseURL}/login`);
  await page.fill('input[placeholder="nome@exemplo.com"]', email);
  await page.fill('input[placeholder="••••••••"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/app(\/|$)/, { timeout: 60_000 });
}

async function loginApi(email: string): Promise<string> {
  const res = await fetch(`${apiURL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`API login failed for ${email}: ${res.status} ${await res.text()}`);
  }
  const setCookie = res.headers.getSetCookie();
  return setCookie.map((cookie) => cookie.split(';')[0]).join('; ');
}

async function postWithCookie(pathname: string, cookie: string): Promise<void> {
  const res = await fetch(`${apiURL}${pathname}`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!res.ok) {
    throw new Error(`POST ${pathname} failed: ${res.status} ${await res.text()}`);
  }
}

async function postWithCookieRetry(pathname: string, cookie: string, attempts = 5): Promise<void> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await postWithCookie(pathname, cookie);
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
  throw lastError ?? new Error(`POST ${pathname} failed`);
}

function createTinyPng(): string {
  const filePath = path.join('/tmp', `pdc-course-cover-${Date.now()}.png`);
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';
  fs.writeFileSync(filePath, Buffer.from(png, 'base64'));
  return filePath;
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const networkFailures: string[] = [];

  try {
    const mentorContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const mentorPage = await mentorContext.newPage();
    mentorPage.on('pageerror', (err) => networkFailures.push(`pageerror:${err.message}`));
    mentorPage.on('response', (res) => {
      if (res.status() >= 500) networkFailures.push(`${res.status()} ${res.url()}`);
    });

    await loginUi(mentorPage, 'mentor@traycer.test');
    await mentorPage.goto(`${baseURL}/app/mentor/cursos/criar`);
    await mentorPage.waitForSelector('text=Sovereign Course Builder', { timeout: 30_000 });

    await mentorPage.locator('input[type="file"]').first().setInputFiles(createTinyPng());
    await mentorPage.waitForSelector('text=Mídia materializada com sucesso', { timeout: 30_000 });

    await mentorPage.locator('input[placeholder="Ex: Engenharia de Prompt de Elite"]').fill(courseTitle);
    await mentorPage.locator('textarea[placeholder="O que o estudante irá conquistar?"]').fill(
      'Curso criado durante auditoria E2E para validar criação, upload, revisão, inscrição, consumo e avaliação.',
    );
    await mentorPage.locator('input[placeholder="Título do Conteúdo"]').first().fill('Aula auditável inicial');
    await mentorPage.locator('textarea[placeholder="Conteúdo textual, instruções da tarefa ou descrição do recurso."]').first().fill(
      'Conteúdo textual real para validar o player do estudante.',
    );

    const createResponsePromise = mentorPage.waitForResponse((res) =>
      res.url().includes('/cursos') && res.request().method() === 'POST',
      { timeout: 10_000 },
    );
    await mentorPage.getByRole('button', { name: /Submeter para Revisão/i }).click();
    const createResponse = await createResponsePromise.catch(async (err: unknown) => {
      const screenshotPath = path.join('/tmp', `pdc-course-create-timeout-${Date.now()}.png`);
      await mentorPage.screenshot({ path: screenshotPath, fullPage: true });
      const bodyText = await mentorPage.locator('body').innerText();
      throw new Error(
        `Course create request was not sent. Screenshot: ${screenshotPath}\n` +
        `Visible text:\n${bodyText.slice(0, 4000)}\n` +
        (err instanceof Error ? err.message : String(err)),
      );
    });
    if (createResponse.status() !== 201) {
      throw new Error(`Course create failed: ${createResponse.status()} ${await createResponse.text()}`);
    }
    const created = await createResponse.json() as { id?: string };
    if (!created.id) throw new Error('Course create response did not include id');
    const courseId = String(created.id);
    await mentorPage.waitForURL(/\/app\/mentor\/cursos|\/app\/dashboard\/mentor|\/app\/dashboard\/instituicao/, { timeout: 30_000 });
    await mentorContext.close();

    const adminCookie = await loginApi('super_admin@traycer.test');
    await postWithCookieRetry(`/moderacao/curso/${courseId}/aprovar`, adminCookie);

    const studentContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const studentPage = await studentContext.newPage();
    studentPage.on('pageerror', (err) => networkFailures.push(`student-pageerror:${err.message}`));
    studentPage.on('response', (res) => {
      if (res.status() >= 500) networkFailures.push(`${res.status()} ${res.url()}`);
    });

    await loginUi(studentPage, 'estudante@traycer.test');
    await studentPage.goto(`${baseURL}/app/cursos?q=${encodeURIComponent(courseTitle)}`);
    await studentPage.waitForSelector(`text=${courseTitle}`, { timeout: 30_000 });
    await studentPage.getByRole('link', { name: new RegExp(courseTitle) }).first().click();
    await studentPage.waitForURL(/\/app\/cursos\/\d+/, { timeout: 30_000 });
    const enrollButton = studentPage.getByRole('button', { name: /Iniciar Percurso/i });
    await enrollButton.click({ timeout: 10_000 }).catch(async (err: unknown) => {
      const screenshotPath = path.join('/tmp', `pdc-course-enroll-missing-${Date.now()}.png`);
      await studentPage.screenshot({ path: screenshotPath, fullPage: true });
      const bodyText = await studentPage.locator('body').innerText();
      throw new Error(
        `Enrollment CTA not available. Screenshot: ${screenshotPath}\n` +
        `Visible text:\n${bodyText.slice(0, 4000)}\n` +
        (err instanceof Error ? err.message : String(err)),
      );
    });
    await studentPage.waitForSelector('text=Já fazes parte da Trilha', { timeout: 30_000 });
    await studentPage.getByRole('link', { name: /Abrir/i }).first().click();
    await studentPage.waitForSelector('text=Conteúdo textual real para validar o player do estudante.', { timeout: 30_000 }).catch(async (err: unknown) => {
      const screenshotPath = path.join('/tmp', `pdc-course-player-content-missing-${Date.now()}.png`);
      await studentPage.screenshot({ path: screenshotPath, fullPage: true });
      const bodyText = await studentPage.locator('body').innerText();
      throw new Error(
        `Player content not visible. Screenshot: ${screenshotPath}\n` +
        `URL: ${studentPage.url()}\n` +
        `Visible text:\n${bodyText.slice(0, 4000)}\n` +
        (err instanceof Error ? err.message : String(err)),
      );
    });
    await studentPage.getByRole('button', { name: /Marcar como concluído/i }).click();
    await studentPage.waitForURL(/\/app\/cursos\/\d+$/, { timeout: 30_000 });
    await studentPage.waitForSelector('text=100%', { timeout: 30_000 });
    await studentPage.getByRole('button', { name: 'Avaliar com 5 estrelas' }).click();
    await studentPage.waitForTimeout(1500);
    await studentContext.close();

    if (networkFailures.length > 0) {
      throw new Error(`Runtime failures detected:\n${networkFailures.join('\n')}`);
    }

    console.log(JSON.stringify({ ok: true, courseId, courseTitle }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.stack ?? err.message : String(err));
  process.exit(1);
});
