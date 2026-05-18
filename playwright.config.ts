import { defineConfig, devices } from '@playwright/test';

const apiWebServerEnv = {
  NODE_ENV: process.env.NODE_ENV ?? 'test',
  DEV_SKIP_OTP: process.env.DEV_SKIP_OTP ?? 'true',
  API_URL: process.env.API_URL ?? 'http://localhost:3001',
  FRONTEND_URL: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  STRAPI_URL: process.env.STRAPI_URL ?? 'http://localhost:1337',
  STRAPI_API_TOKEN: process.env.STRAPI_API_TOKEN ?? 'test-strapi-token',
  JWT_SECRET: process.env.JWT_SECRET ?? 'test-jwt-secret-for-ci-minimum-32-chars',
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
};

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['**/*.spec.ts', '**/*.e2e.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ...(process.env.CI ? [['github' as const]] : []),
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Auth setup — creates storageState files for each role
    { name: 'setup', testMatch: /setup\.auth\.ts/ },

    // Smoke suite — critical path only (runs on every PR)
    {
      name: 'smoke',
      testMatch: /critical-path\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: 'tests/.auth/aluno.json' },
      dependencies: ['setup'],
    },

    // Full suite — Chromium (runs on merge to main)
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'tests/.auth/aluno.json' },
      dependencies: ['setup'],
    },

    // Full suite — Firefox (runs on merge to main)
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], storageState: 'tests/.auth/aluno.json' },
      dependencies: ['setup'],
    },
  ],
  webServer: [
    {
      command: 'cd apps/api && npx tsx watch src/index.ts',
      env: apiWebServerEnv,
      url: 'http://localhost:3001/bootstrap',
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: 'npm run dev -w apps/web -- --force',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
