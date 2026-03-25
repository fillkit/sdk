import { describe, it, expect } from 'vitest';
import { BiometricStrategy } from '../../src/strategies/BiometricStrategy.js';
import { faker } from '@faker-js/faker';

describe('BiometricStrategy', () => {
  const strategy = new BiometricStrategy();

  describe('valid mode - height', () => {
    it('should generate a height within default range', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'height',
        faker,
      });
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(150);
      expect(result).toBeLessThanOrEqual(200);
    });

    it('should respect custom min/max constraints', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'height',
        constraints: { min: 160, max: 170 },
        faker,
      });
      expect(result).toBeGreaterThanOrEqual(160);
      expect(result).toBeLessThanOrEqual(170);
    });
  });

  describe('valid mode - weight', () => {
    it('should generate a weight within default range', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'weight',
        faker,
      });
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(50);
      expect(result).toBeLessThanOrEqual(120);
    });
  });

  describe('valid mode - bloodType (weighted distribution)', () => {
    it('should generate a valid blood type', () => {
      const validTypes = ['O+', 'A+', 'B+', 'O-', 'A-', 'AB+', 'AB-', 'B-'];
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'bloodType',
        faker,
      });
      expect(validTypes).toContain(result);
    });

    it('should use weighted distribution (O+ and A+ should appear most often)', () => {
      const counts: Record<string, number> = {};
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const result = strategy.generate({
          mode: 'valid',
          fieldType: 'bloodType',
          faker,
        }) as string;
        counts[result] = (counts[result] || 0) + 1;
      }

      // O+ (38%) should be the most common
      expect(counts['O+'] || 0).toBeGreaterThan(counts['AB-'] || 0);
      // A+ (27%) should also be common
      expect(counts['A+'] || 0).toBeGreaterThan(counts['B-'] || 0);
    });
  });

  describe('invalid mode', () => {
    it('should generate invalid biometric data', () => {
      const result = strategy.generate({
        mode: 'invalid',
        fieldType: 'height',
        faker,
      });
      // Invalid values: 500, -10, 'invalid', 'abc'
      const isInvalid =
        result === 500 ||
        result === 1000 ||
        result === -10 ||
        result === 'invalid' ||
        result === 'XY+' ||
        result === 'abc';
      expect(isInvalid).toBe(true);
    });
  });

  describe('validate', () => {
    it('should validate a valid blood type', () => {
      expect(strategy.validate('O+', { fieldType: 'bloodType' })).toBe(true);
    });

    it('should reject an invalid blood type', () => {
      expect(strategy.validate('XY+', { fieldType: 'bloodType' })).toBe(false);
    });

    it('should validate height within range', () => {
      expect(
        strategy.validate(175, {
          fieldType: 'height',
          constraints: { min: 150, max: 200 },
        })
      ).toBe(true);
    });

    it('should reject height out of range', () => {
      expect(
        strategy.validate(300, {
          fieldType: 'height',
          constraints: { min: 150, max: 200 },
        })
      ).toBe(false);
    });
  });
});
