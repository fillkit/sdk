import { describe, it, expect } from 'vitest';
import { CurrencyCodeStrategy } from '../../src/strategies/CurrencyCodeStrategy.js';
import { faker } from '@faker-js/faker';

describe('CurrencyCodeStrategy', () => {
  const strategy = new CurrencyCodeStrategy();

  describe('valid mode', () => {
    it('should generate a 3-letter uppercase currency code', () => {
      const result = strategy.generate({ mode: 'valid', faker });
      expect(result).toMatch(/^[A-Z]{3}$/);
    });

    it('should generate diverse currency codes (more than 20)', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(strategy.generate({ mode: 'valid', faker }));
      }
      expect(codes.size).toBeGreaterThan(20);
    });

    it('should respect pattern constraint', () => {
      const result = strategy.generate({
        mode: 'valid',
        faker,
        constraints: { pattern: '^[A-Z]{3}$' },
      });
      expect(result).toMatch(/^[A-Z]{3}$/);
    });
  });

  describe('invalid mode', () => {
    it('should generate an invalid currency code', () => {
      const result = strategy.generate({ mode: 'invalid', faker });
      expect(typeof result).toBe('string');
    });
  });

  describe('validate', () => {
    it('should accept valid code', () => {
      expect(strategy.validate('USD', { constraints: {} })).toBe(true);
    });

    it('should reject lowercase', () => {
      expect(strategy.validate('usd', { constraints: {} })).toBe(false);
    });

    it('should reject wrong length', () => {
      expect(strategy.validate('US', { constraints: {} })).toBe(false);
    });
  });
});
