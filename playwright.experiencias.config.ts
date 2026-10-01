import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// Keep the server stable while collecting E2E evidence for this isolated slice.
export default defineConfig({
  ...base,
  webServer: Array.isArray(base.webServer)
    ? base.webServer.map((server) => ({
        ...server,
        command: server.command.replace('tsx watch src/index.ts', 'tsx src/index.ts'),
        timeout: 60000,
      }))
    : base.webServer,
});
