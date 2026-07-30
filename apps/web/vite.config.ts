import { defineConfig, loadEnv, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const buildEnv = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  const sentryAuthToken = buildEnv.SENTRY_AUTH_TOKEN?.trim();
  const sentryOrg = buildEnv.SENTRY_ORG?.trim();
  const sentryProject = buildEnv.SENTRY_PROJECT?.trim();
  const release = buildEnv.VITE_APP_VERSION?.trim();
  const sentryConfigured = Boolean(sentryAuthToken && sentryOrg && sentryProject && release);
  const plugins: PluginOption[] = [react(), tailwindcss()];

  if (sentryAuthToken && sentryOrg && sentryProject && release) {
    plugins.push(
      sentryVitePlugin({
        authToken: sentryAuthToken,
        org: sentryOrg,
        project: sentryProject,
        telemetry: false,
        release: {
          name: release,
          setCommits: false,
        },
        sourcemaps: {
          filesToDeleteAfterUpload: ['./dist/**/*.map'],
        },
      })
    );
  }

  return {
    plugins,
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: 5173,
      },
      proxy: {
        '/api': {
          target: buildEnv.VITE_API_URL ?? 'http://localhost:3001',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api/, ''),
        },
        '/socket.io': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          ws: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: sentryConfigured ? 'hidden' : false,
      target: 'es2022',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
          },
        },
      },
    },
  };
});
