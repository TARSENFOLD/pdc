import { describe, expect, it } from 'vitest';
import { safeRenderableUrl } from './safe-url.js';

describe('safeRenderableUrl', () => {
  it('normaliza endereços HTTPS', () => {
    expect(safeRenderableUrl('  https://cdn.example.com/aula.mp4  '))
      .toBe('https://cdn.example.com/aula.mp4');
  });

  it('recusa protocolos executáveis ou inseguros', () => {
    expect(safeRenderableUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeRenderableUrl('data:text/html,<script>alert(1)</script>')).toBeUndefined();
    expect(safeRenderableUrl('http://example.com/aula')).toBeUndefined();
    expect(safeRenderableUrl('endereço inválido')).toBeUndefined();
  });

  it('permite HTTP local apenas quando a política o autoriza', () => {
    expect(safeRenderableUrl('http://localhost:3001/media/aula.mp4')).toBeUndefined();
    expect(safeRenderableUrl('http://localhost:3001/media/aula.mp4', { allowLocalHttp: true }))
      .toBe('http://localhost:3001/media/aula.mp4');
    expect(safeRenderableUrl('http://example.com/aula.mp4', { allowLocalHttp: true }))
      .toBeUndefined();
  });
});
