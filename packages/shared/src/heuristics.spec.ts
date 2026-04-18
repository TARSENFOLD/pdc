import { describe, it, expect } from 'vitest';
import { analyzeFluidity, analyzeResilience, analyzeFocus, analyzeHesitation } from './heuristics';

describe('Heuristics Characterization Tests', () => {
  describe('analyzeFluidity', () => {
    it('should return EXCELENTE for phi >= 0.8', () => {
      expect(analyzeFluidity(0.8).level).toBe('EXCELENTE');
      expect(analyzeFluidity(1.0).level).toBe('EXCELENTE');
    });
  });

  describe('analyzeHesitation', () => {
    it('should return EXCELENTE for hesitation < 1000ms', () => {
      expect(analyzeHesitation(500).level).toBe('EXCELENTE');
    });
    it('should return VULNERAVEL for long hesitation', () => {
      expect(analyzeHesitation(6000).level).toBe('VULNERAVEL');
    });
  });
});
