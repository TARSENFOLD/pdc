import * as Sentry from '@sentry/react';
import { initWebSentry } from './lib/sentry';

initWebSentry();

void import('./main').catch((error: unknown) => {
  Sentry.captureException(error);
  console.error('Falha ao carregar a aplicação', error);
});
