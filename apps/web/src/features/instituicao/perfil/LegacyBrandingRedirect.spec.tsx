import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LegacyBrandingRedirect } from './LegacyBrandingRedirect';

describe('LegacyBrandingRedirect', () => {
  it('preserva o link antigo e abre a identidade institucional canónica', () => {
    render(
      <MemoryRouter initialEntries={['/app/instituicao/branding']}>
        <Routes>
          <Route path="/app/instituicao/branding" element={<LegacyBrandingRedirect />} />
          <Route
            path="/app/instituicao/perfil/identidade"
            element={<div>Identidade institucional</div>}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Identidade institucional')).toBeDefined();
  });
});
