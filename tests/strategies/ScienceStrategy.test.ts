import { describe, it, expect } from 'vitest';
import { ScienceStrategy } from '@/strategies/ScienceStrategy.js';
import type { ValueOptions } from '@/types/index.js';

describe('ScienceStrategy', () => {
  const strategy = new ScienceStrategy();

  const makeOptions = (
    fieldType: string,
    mode: 'valid' | 'invalid' = 'valid'
  ): ValueOptions =>
    ({
      fieldType,
      mode,
    }) as ValueOptions;

  describe('valid mode', () => {
    it('generates a chemical element name', () => {
      const result = strategy.generate(makeOptions('chemicalElement'));
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      // Should be a real element name (capitalized word)
      expect(result).toMatch(/^[A-Z][a-z]+/);
    });

    it('generates a science unit with symbol', () => {
      const result = strategy.generate(makeOptions('scienceUnit'));
      expect(typeof result).toBe('string');
      // Format: "name (symbol)"
      expect(result).toMatch(/.+ \(.+\)/);
    });

    it('defaults to chemical element for unknown fieldType', () => {
      const result = strategy.generate(makeOptions('unknown'));
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^[A-Z][a-z]+/);
    });
  });

  describe('invalid mode', () => {
    it('returns an invalid value', () => {
      const result = strategy.generate(
        makeOptions('chemicalElement', 'invalid')
      );
      expect(['', 'Unobtanium', 'InvalidUnit']).toContain(result);
    });
  });

  describe('uniqueness', () => {
    it('can generate multiple different elements', () => {
      const results = new Set<string>();
      for (let i = 0; i < 20; i++) {
        results.add(strategy.generate(makeOptions('chemicalElement')));
      }
      expect(results.size).toBeGreaterThan(1);
    });
  });
});
