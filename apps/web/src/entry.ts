import * as Sentry from '@sentry/react';
import { initWebSentry } from './lib/sentry';

function renderStartupFailure(reloadPage: () => void): void {
  const root = document.getElementById('root');
  if (!root) return;

  const main = document.createElement('main');
  main.setAttribute('role', 'main');
  main.style.cssText =
    'min-height:100vh;display:grid;place-items:center;padding:24px;background:#111;color:#f5f5f5;font-family:system-ui,sans-serif;text-align:center';

  const content = document.createElement('div');
  content.style.cssText = 'max-width:480px';

  const heading = document.createElement('h1');
  heading.textContent = 'Falha na inicialização';
  heading.style.cssText = 'margin:0 0 12px;font-size:28px;line-height:1.2';

  const message = document.createElement('p');
  message.textContent =
    'Não foi possível carregar a aplicação. Atualize a página e tente novamente.';
  message.style.cssText = 'margin:0 0 24px;color:#b8b8b8;line-height:1.5';

  const retry = document.createElement('button');
  retry.type = 'button';
  retry.textContent = 'Tentar novamente';
  retry.style.cssText =
    'border:0;padding:12px 18px;background:#a94f22;color:#fff;font:inherit;font-weight:700;cursor:pointer';
  retry.addEventListener('click', () => {
    reloadPage();
  });

  content.append(heading, message, retry);
  main.append(content);
  root.replaceChildren(main);
}

export async function loadWebApplication(
  loadApplication: () => Promise<unknown> = () => import('./main'),
  reloadPage: () => void = () => {
    window.location.reload();
  }
): Promise<void> {
  try {
    await loadApplication();
  } catch (error: unknown) {
    Sentry.captureException(error);
    console.error('Falha ao carregar a aplicação', error);
    renderStartupFailure(reloadPage);
  }
}

initWebSentry();
void loadWebApplication();
