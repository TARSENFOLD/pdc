import { describe, it, expect } from 'vitest';
import { analyzeFluidity, analyzeResilience, analyzeFocus } from '@pdc/shared';

describe('Heuristics Engine Characterization Tests', () => {
  describe('analyzeFluidity', () => {
    it('should return correct DiagnosticLevel for each threshold', () => {
      expect(analyzeFluidity(0.8).level).toBe('EXCELENTE');
      expect(analyzeFluidity(0.5).level).toBe('ESTAVEL');
      expect(analyzeFluidity(0.3).level).toBe('VULNERAVEL');
      expect(analyzeFluidity(0.2).level).toBe('CRITICO');
    });

    it('should return correct score and insights for EXCELENTE', () => {
      const result = analyzeFluidity(0.8);
      expect(result.score).toBe(9.5);
      expect(result.insight).toContain('fluida e instintiva');
    });

    it('should handle edge cases (0, 1, NaN, Infinity)', () => {
      expect(analyzeFluidity(0).level).toBe('CRITICO');
      expect(analyzeFluidity(1).level).toBe('EXCELENTE');
      expect(analyzeFluidity(NaN).level).toBe('CRITICO');
      expect(analyzeFluidity(Infinity).level).toBe('EXCELENTE');
    });

    it('should be deterministic (10x same input)', () => {
      const input = 0.6;
      const firstResult = analyzeFluidity(input);
      for (let i = 0; i < 10; i++) {
        expect(analyzeFluidity(input)).toEqual(firstResult);
      }
    });
  });

  describe('analyzeResilience', () => {
    it('should return correct DiagnosticLevel for each threshold and boundary', () => {
      // Threshold 0.9 (CRITICO vs EXCELENTE)
      expect(analyzeResilience(0.89).level).toBe('CRITICO');
      expect(analyzeResilience(0.9).level).toBe('EXCELENTE');
      
      // Mid-range EXCELENTE
      expect(analyzeResilience(1.0).level).toBe('EXCELENTE');
      
      // Threshold 1.2 (EXCELENTE vs ESTAVEL)
      expect(analyzeResilience(1.2).level).toBe('EXCELENTE');
      expect(analyzeResilience(1.21).level).toBe('ESTAVEL');
      
      // Mid-range ESTAVEL
      expect(analyzeResilience(1.5).level).toBe('ESTAVEL');
      
      // Threshold 2.0 (ESTAVEL vs VULNERAVEL)
      expect(analyzeResilience(2.0).level).toBe('ESTAVEL');
      expect(analyzeResilience(2.01).level).toBe('VULNERAVEL');
      
      // High-range VULNERAVEL
      expect(analyzeResilience(2.5).level).toBe('VULNERAVEL');
    });

    it('should return correct score and insights for EXCELENTE', () => {
      const result = analyzeResilience(1.0);
      expect(result.score).toBe(9.8);
      expect(result.insight).toContain('Manténs a precisão');
    });

    it('should handle edge cases (0, max, NaN, Infinity)', () => {
      expect(analyzeResilience(0).level).toBe('CRITICO');
      expect(analyzeResilience(10).level).toBe('VULNERAVEL');
      expect(analyzeResilience(NaN).level).toBe('CRITICO');
      expect(analyzeResilience(Infinity).level).toBe('VULNERAVEL');
    });

    it('should be deterministic (10x same input)', () => {
      const input = 1.1;
      const firstResult = analyzeResilience(input);
      for (let i = 0; i < 10; i++) {
        expect(analyzeResilience(input)).toEqual(firstResult);
      }
    });
  });

  describe('analyzeFocus', () => {
    it('should return correct DiagnosticLevel for each threshold', () => {
      expect(analyzeFocus(0.9).level).toBe('EXCELENTE');
      expect(analyzeFocus(0.7).level).toBe('ESTAVEL');
      expect(analyzeFocus(0.5).level).toBe('VULNERAVEL');
    });

    it('should return correct score and insights for EXCELENTE', () => {
      const result = analyzeFocus(0.95);
      expect(result.score).toBe(10);
      expect(result.insight).toContain('Foco inabalável');
    });

    it('should handle edge cases (0, 1, NaN, Infinity)', () => {
      expect(analyzeFocus(0).level).toBe('VULNERAVEL');
      expect(analyzeFocus(1).level).toBe('EXCELENTE');
      expect(analyzeFocus(NaN).level).toBe('VULNERAVEL');
      expect(analyzeFocus(Infinity).level).toBe('EXCELENTE');
    });

    it('should be deterministic (10x same input)', () => {
      const input = 0.8;
      const firstResult = analyzeFocus(input);
      for (let i = 0; i < 10; i++) {
        expect(analyzeFocus(input)).toEqual(firstResult);
      }
    });
  });
});
