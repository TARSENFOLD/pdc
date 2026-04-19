import { test as base, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';

export type Role = 'aluno' | 'mentor' | 'instituicao' | 'moderador' | 'super_admin';

const BFF = 'http://localhost:3001';

/**
 * Reuses cached storageState files created in setup.auth.ts (via UI login).
 */
export async function loginAs(page: Page, role: Role) {
  const storageFile = path.resolve(__dirname, `../.auth/${role}.json`);
  await page.context().storageState({ path: storageFile });
  return storageFile;
}

/**
 * Extended test fixtures providing pre-authed pages for each role.
 */
export const test = base.extend<{
  alunoPage: Page;
  mentorPage: Page;
  instituicaoPage: Page;
  moderadorPage: Page;
  adminPage: Page;
}>({
  alunoPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: storageStatePath('aluno') });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
  mentorPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: storageStatePath('mentor') });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
  instituicaoPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: storageStatePath('instituicao') });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
  moderadorPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: storageStatePath('moderador') });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
  adminPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: storageStatePath('super_admin') });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
});

function storageStatePath(role: Role) {
  return path.resolve(__dirname, `../.auth/${role}.json`);
}

export { expect } from '@playwright/test';
