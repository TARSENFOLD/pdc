import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider } from 'react-router-dom';
import './lib/i18n'; // Initialize i18n before everything else
import { router } from './router';
import { AuthProvider } from './lib/auth/AuthContext';
import { BootstrapProvider } from './lib/bootstrap/BootstrapContext';
import { ThemeProvider } from './lib/theme/ThemeContext';
import { Toaster, InstallPrompt } from './components/ui';
import './index.css';

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN as string,
    environment: import.meta.env.MODE,
    release: (import.meta.env.VITE_APP_VERSION as string | undefined) ?? '0.0.0',
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      // Detect when a new SW version installs and is waiting
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    }).catch(() => {});

    // Reload page when new SW takes control (after SKIP_WAITING)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  });
}

window.addEventListener('pdc:session-expired', () => {
  if (window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BootstrapProvider>
          <AuthProvider>
            <RouterProvider router={router} future={{ v7_startTransition: true }} />
            <Toaster />
            <InstallPrompt />
            <ReactQueryDevtools initialIsOpen={false} />
          </AuthProvider>
        </BootstrapProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>
);
