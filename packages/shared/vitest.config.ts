import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    // index.contract.spec.ts faz dynamic imports de ~30 módulos TS — precisa de mais tempo
    testTimeout: 30000,
  },
});
