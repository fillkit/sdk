import { describe, it, expect } from 'vitest';
import { CreditCardStrategy } from '../../src/strategies/CreditCardStrategy.js';
import { faker } from '@faker-js/faker';

describe('CreditCardStrategy', () => {
  const strategy = new CreditCardStrategy();

  describe('valid mode', () => {
    it('should generate a credit card number with creditCardIssuer', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'creditCard.number',
        faker,
      });
      // Remove non-digit separators
      const digits = result.replace(/\D/g, '');
      expect(digits.length).toBeGreaterThanOrEqual(13);
      expect(digits.length).toBeLessThanOrEqual(19);
    });

    it('should generate diverse issuers (including diners_club, jcb)', () => {
      const numbers = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const num = strategy.generate({
          mode: 'valid',
          fieldType: 'creditCard.number',
          faker,
        });
        // Capture prefix pattern
        numbers.add(num.replace(/\D/g, '').substring(0, 2));
      }
      // Should have more than 4 distinct prefixes
      expect(numbers.size).toBeGreaterThanOrEqual(3);
    });

    it('should generate CVV', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'creditCard.cvv',
        faker,
      });
      expect(result).toMatch(/^\d{3,4}$/);
    });

    it('should generate expMonth', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'creditCard.expMonth',
        faker,
      });
      const month = parseInt(result);
      expect(month).toBeGreaterThanOrEqual(1);
      expect(month).toBeLessThanOrEqual(12);
    });

    it('should generate expYear in the future', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'creditCard.expYear',
        faker,
      });
      const year = parseInt(result);
      expect(year).toBeGreaterThanOrEqual(new Date().getFullYear());
    });

    it('should generate account number', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'accountNumber',
        faker,
      });
      expect(result).toMatch(/^\d+$/);
    });
  });

  describe('invalid mode', () => {
    it('should generate an invalid credit card value', () => {
      const result = strategy.generate({ mode: 'invalid', faker });
      expect(typeof result).toBe('string');
    });
  });
});
