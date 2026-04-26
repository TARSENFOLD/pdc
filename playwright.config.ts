import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
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
      command: 'npm run dev -w apps/api',
      url: 'http://localhost:3001/bootstrap',
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: 'npm run dev -w apps/web',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
