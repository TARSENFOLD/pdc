import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as reputationService from './reputation.service.js';

describe('ReputationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve calcular o tier correctamente', () => {
    expect(reputationService.getTier(0)).toBe('BRONZE');
    expect(reputationService.getTier(45)).toBe('PRATA');
    expect(reputationService.getTier(75)).toBe('OURO');
    expect(reputationService.getTier(95)).toBe('DIAMANTE');
  });
});
