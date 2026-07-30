import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const buildEnv = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  const release = buildEnv.VITE_APP_VERSION?.trim();

  return {
    plugins: [react(), tailwindcss()],
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
      sourcemap: release ? 'hidden' : false,
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
