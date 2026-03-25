import { describe, it, expect } from 'vitest';
import { FoodStrategy } from '@/strategies/FoodStrategy.js';
import type { ValueOptions } from '@/types/index.js';

describe('FoodStrategy', () => {
  const strategy = new FoodStrategy();

  const makeOptions = (
    fieldType: string,
    mode: 'valid' | 'invalid' = 'valid'
  ): ValueOptions =>
    ({
      fieldType,
      mode,
    }) as ValueOptions;

  describe('valid mode', () => {
    it('generates a food dish', () => {
      const result = strategy.generate(makeOptions('foodDish'));
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('generates a food ingredient', () => {
      const result = strategy.generate(makeOptions('foodIngredient'));
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('generates a food description', () => {
      const result = strategy.generate(makeOptions('foodDescription'));
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(1);
    });

    it('generates a cuisine type', () => {
      const result = strategy.generate(makeOptions('cuisineType'));
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('defaults to food dish for unknown fieldType', () => {
      const result = strategy.generate(makeOptions('unknown'));
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('invalid mode', () => {
    it('returns an invalid value', () => {
      const result = strategy.generate(makeOptions('foodDish', 'invalid'));
      expect(['', '12345', '<script>alert("xss")</script>']).toContain(result);
    });
  });

  describe('uniqueness', () => {
    it('can generate multiple different dishes', () => {
      const results = new Set<string>();
      for (let i = 0; i < 20; i++) {
        results.add(strategy.generate(makeOptions('foodDish')));
      }
      expect(results.size).toBeGreaterThan(1);
    });
  });
});
