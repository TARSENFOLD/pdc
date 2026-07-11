import { test as base, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';

export type Role = 'aluno' | 'estudante' | 'mentor' | 'instituicao' | 'moderador' | 'comite_cientifico' | 'super_admin';

const BFF = 'http://localhost:3001';
const COOKIE_CONSENT_STORAGE_KEY = 'pdc.cookie-consent.v1';
const ESSENTIAL_COOKIE_CONSENT = JSON.stringify({
  choice: 'essential',
  acceptedAt: '2026-01-01T00:00:00.000Z',
});

/**
 * Reuses cached storageState files created in setup.auth.ts (via UI login).
 */
export async function loginAs(page: Page, role: Role) {
  const storageFile = path.resolve(__dirname, `../.auth/${role}.json`);
  await page.context().storageState({ path: storageFile });
  return storageFile;
}

function storageStatePath(role: Role) {
  return path.resolve(__dirname, `../.auth/${role}.json`);
}

async function installEssentialCookieConsent(context: BrowserContext): Promise<void> {
  await context.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    { key: COOKIE_CONSENT_STORAGE_KEY, value: ESSENTIAL_COOKIE_CONSENT },
  );
}

/**
 * Extended test fixtures providing pre-authed pages for each role.
 */
export const test = base.extend<{
  alunoPage: Page;
  estudantePage: Page;
  mentorPage: Page;
  instituicaoPage: Page;
  moderadorPage: Page;
  comiteCientificoPage: Page;
  patrocinadorPage: Page;
  adminPage: Page;
}>({
  page: async ({ page }, use) => {
    await installEssentialCookieConsent(page.context());
    await use(page);
  },
  alunoPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: storageStatePath('aluno') });
    await installEssentialCookieConsent(ctx);
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
  estudantePage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: storageStatePath('estudante') });
    await installEssentialCookieConsent(ctx);
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
  mentorPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: storageStatePath('mentor') });
    await installEssentialCookieConsent(ctx);
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
  instituicaoPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: storageStatePath('instituicao') });
    await installEssentialCookieConsent(ctx);
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
  moderadorPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: storageStatePath('moderador') });
    await installEssentialCookieConsent(ctx);
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
  comiteCientificoPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: storageStatePath('comite_cientifico') });
    await installEssentialCookieConsent(ctx);
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
  patrocinadorPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: storageStatePath('patrocinador') });
    await installEssentialCookieConsent(ctx);
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
  adminPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: storageStatePath('super_admin') });
    await installEssentialCookieConsent(ctx);
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
});

export { expect } from '@playwright/test';
