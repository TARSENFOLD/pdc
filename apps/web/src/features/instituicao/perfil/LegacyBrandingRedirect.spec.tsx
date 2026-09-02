import { act, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LegacyBrandingRedirect } from './LegacyBrandingRedirect';

describe('LegacyBrandingRedirect', () => {
  it('substitui o link antigo pela identidade institucional canónica', async () => {
    const router = createMemoryRouter([
      { path: '/app/home', element: <div>Página anterior</div> },
      { path: '/app/instituicao/branding', element: <LegacyBrandingRedirect /> },
      {
        path: '/app/instituicao/perfil/identidade',
        element: <div>Identidade institucional</div>,
      },
    ], {
      initialEntries: ['/app/home', '/app/instituicao/branding'],
      initialIndex: 1,
    });
    render(<RouterProvider router={router} />);

    await screen.findByText('Identidade institucional');
    expect(router.state.location.pathname).toBe('/app/instituicao/perfil/identidade');

    await act(async () => {
      await router.navigate(-1);
    });

    expect(router.state.location.pathname).toBe('/app/home');
    expect(screen.getByText('Página anterior')).toBeTruthy();
  });
});
