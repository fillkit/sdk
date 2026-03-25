import { describe, it, expect } from 'vitest';
import { CountryCodeStrategy } from '../../src/strategies/CountryCodeStrategy.js';
import { faker } from '@faker-js/faker';

describe('CountryCodeStrategy', () => {
  const strategy = new CountryCodeStrategy();

  describe('valid mode - alpha-2', () => {
    it('should generate a 2-letter country code by default', () => {
      const result = strategy.generate({ mode: 'valid', faker });
      expect(result).toMatch(/^[A-Z]{2}$/);
    });
  });

  describe('valid mode - alpha-3', () => {
    it('should generate a 3-letter code when maxlength is 3', () => {
      const result = strategy.generate({
        mode: 'valid',
        faker,
        constraints: { maxlength: 3 },
      });
      expect(result).toMatch(/^[A-Z]{3}$/);
    });
  });

  describe('valid mode - diversity', () => {
    it('should produce diverse country codes', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 50; i++) {
        codes.add(strategy.generate({ mode: 'valid', faker }));
      }
      expect(codes.size).toBeGreaterThan(10);
    });
  });

  describe('invalid mode', () => {
    it('should generate an invalid country code', () => {
      const result = strategy.generate({ mode: 'invalid', faker });
      expect(typeof result).toBe('string');
    });
  });

  describe('validate', () => {
    it('should accept valid alpha-2', () => {
      expect(strategy.validate('US', { constraints: {} })).toBe(true);
    });

    it('should accept valid alpha-3', () => {
      expect(strategy.validate('USA', { constraints: {} })).toBe(true);
    });

    it('should reject lowercase', () => {
      expect(strategy.validate('us', { constraints: {} })).toBe(false);
    });
  });
});
