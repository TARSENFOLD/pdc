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
import { CookieBanner } from './components/privacy/CookieBanner';
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

const SERVICE_WORKER_CLEANUP_VERSION_KEY = 'pdc:service-worker-cleanup:v1';

interface CleanupRegistration {
  unregister(): Promise<boolean>;
}

interface CleanupMarkerStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type ServiceWorkerCleanupDecision = 'continue' | 'reload';

function hasCompletedServiceWorkerCleanup(storage: CleanupMarkerStorage): boolean {
  try {
    return storage.getItem(SERVICE_WORKER_CLEANUP_VERSION_KEY) === '1';
  } catch {
    return false;
  }
}

export async function cleanupServiceWorkersBeforeBootstrap(
  hadController: boolean,
  getRegistrations: () => Promise<readonly CleanupRegistration[]>,
  storage: CleanupMarkerStorage,
): Promise<ServiceWorkerCleanupDecision> {
  if (hasCompletedServiceWorkerCleanup(storage)) return 'continue';

  let registrations: readonly CleanupRegistration[];
  try {
    registrations = await getRegistrations();
  } catch {
    return 'continue';
  }

  const results = await Promise.allSettled(
    registrations.map(async (registration) => registration.unregister()),
  );
  const removedRegistration = results.some(
    (result) => result.status === 'fulfilled' && result.value,
  );
  const cleanupSucceeded = results.every(
    (result) => result.status === 'fulfilled' && result.value,
  );

  if (!cleanupSucceeded) return 'continue';

  try {
    storage.setItem(SERVICE_WORKER_CLEANUP_VERSION_KEY, '1');
  } catch {
    return 'continue';
  }

  return hadController && removedRegistration ? 'reload' : 'continue';
}

function registerCurrentServiceWorker(): void {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
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

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  });
}

if (!import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => {
        registrations.forEach((registration) => {
          void registration.unregister();
        });
      })
      .catch(() => {});
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

function renderApplication(): void {
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
              <CookieBanner />
              <InstallPrompt />
              <ReactQueryDevtools initialIsOpen={false} />
            </AuthProvider>
          </BootstrapProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </React.StrictMode>,
  );
}

async function bootstrapApplication(): Promise<void> {
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    let decision: ServiceWorkerCleanupDecision = 'continue';
    try {
      decision = await cleanupServiceWorkersBeforeBootstrap(
        navigator.serviceWorker.controller !== null,
        () => navigator.serviceWorker.getRegistrations(),
        window.localStorage,
      );
    } catch {
      // Browser APIs may be restricted; that must not leave the application blank.
    }

    if (decision === 'reload') {
      window.location.reload();
      return;
    }
  }

  renderApplication();
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    registerCurrentServiceWorker();
  }
}

void bootstrapApplication();
