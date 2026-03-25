import { describe, it, expect } from 'vitest';
import { GenderStrategy } from '../../src/strategies/GenderStrategy.js';
import { faker } from '@faker-js/faker';

describe('GenderStrategy', () => {
  const strategy = new GenderStrategy();

  describe('valid mode - gender', () => {
    it('should generate a gender identity string', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'gender',
        faker,
      });
      expect(result.length).toBeGreaterThan(0);
      expect(typeof result).toBe('string');
    });

    it('should produce diverse values (inclusive)', () => {
      const genders = new Set<string>();
      for (let i = 0; i < 50; i++) {
        genders.add(
          strategy.generate({ mode: 'valid', fieldType: 'gender', faker })
        );
      }
      expect(genders.size).toBeGreaterThan(2);
    });
  });

  describe('valid mode - sex', () => {
    it('should generate binary sex value', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'sex',
        faker,
      });
      expect(['Male', 'Female', 'male', 'female']).toContain(result);
    });
  });

  describe('invalid mode', () => {
    it('should generate an invalid gender value', () => {
      const result = strategy.generate({ mode: 'invalid', faker });
      expect(typeof result).toBe('string');
    });
  });
});
