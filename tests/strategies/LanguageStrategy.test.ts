import { describe, it, expect } from 'vitest';
import { LanguageStrategy } from '../../src/strategies/LanguageStrategy.js';
import { faker } from '@faker-js/faker';

describe('LanguageStrategy', () => {
  const strategy = new LanguageStrategy();

  describe('valid mode - language', () => {
    it('should generate a 2-letter ISO 639-1 code', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'language',
        faker,
      });
      expect(result).toMatch(/^[a-z]{2}$/);
    });

    it('should generate diverse language codes', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 50; i++) {
        codes.add(
          strategy.generate({ mode: 'valid', fieldType: 'language', faker })
        );
      }
      expect(codes.size).toBeGreaterThan(5);
    });
  });

  describe('valid mode - locale', () => {
    it('should generate a locale in language-COUNTRY format', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'locale',
        faker,
      });
      expect(result).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
    });
  });

  describe('invalid mode', () => {
    it('should generate an invalid language value', () => {
      const result = strategy.generate({ mode: 'invalid', faker });
      expect(typeof result).toBe('string');
    });
  });

  describe('validate', () => {
    it('should accept valid language code', () => {
      expect(
        strategy.validate('en', { fieldType: 'language', constraints: {} })
      ).toBe(true);
    });

    it('should accept valid locale', () => {
      expect(
        strategy.validate('en-US', { fieldType: 'locale', constraints: {} })
      ).toBe(true);
    });

    it('should reject uppercase language', () => {
      expect(
        strategy.validate('EN', { fieldType: 'language', constraints: {} })
      ).toBe(false);
    });
  });
});
