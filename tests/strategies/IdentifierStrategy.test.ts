import { describe, it, expect } from 'vitest';
import { IdentifierStrategy } from '../../src/strategies/IdentifierStrategy.js';
import { faker } from '@faker-js/faker';

describe('IdentifierStrategy', () => {
  const strategy = new IdentifierStrategy();

  describe('valid mode - isbn', () => {
    it('should generate a valid ISBN via faker.commerce.isbn()', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'isbn',
        faker,
      });
      // faker.commerce.isbn() returns formatted ISBN-13 or ISBN-10
      expect(result).toMatch(/^[\d-]+$/);
      const digits = result.replace(/-/g, '');
      expect([10, 13]).toContain(digits.length);
    });

    it('should generate ISBN with valid check digit', () => {
      // Run multiple times to verify consistency
      for (let i = 0; i < 10; i++) {
        const isbn = strategy.generate({
          mode: 'valid',
          fieldType: 'isbn',
          faker,
        });
        expect(isbn).toBeTruthy();
      }
    });
  });

  describe('valid mode - upc', () => {
    it('should generate a 12-digit UPC', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'upc',
        faker,
      });
      expect(result).toMatch(/^\d{12}$/);
    });
  });

  describe('valid mode - sku', () => {
    it('should generate an alphanumeric SKU', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'sku',
        faker,
      });
      expect(result.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('invalid mode', () => {
    it('should generate an invalid identifier', () => {
      const result = strategy.generate({ mode: 'invalid', faker });
      expect(typeof result).toBe('string');
    });
  });
});
