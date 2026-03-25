import { describe, it, expect } from 'vitest';
import { FinancialStrategy } from '../../src/strategies/FinancialStrategy.js';
import { faker } from '@faker-js/faker';

describe('FinancialStrategy', () => {
  const strategy = new FinancialStrategy();

  describe('valid mode', () => {
    it('should generate a valid IBAN', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'iban',
        faker,
      });
      expect(typeof result).toBe('string');
      // IBAN starts with 2-letter country code + 2 check digits
      expect(result).toMatch(/^[A-Z]{2}\d{2}/);
    });

    it('should generate a valid BIC/SWIFT code', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'bic',
        faker,
      });
      expect(typeof result).toBe('string');
      // BIC: 8 or 11 alphanumeric chars
      expect(result.length).toBeGreaterThanOrEqual(8);
      expect(result.length).toBeLessThanOrEqual(11);
    });

    it('should generate a Bitcoin address', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'bitcoinAddress',
        faker,
      });
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThanOrEqual(25);
    });

    it('should generate an Ethereum address', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'ethereumAddress',
        faker,
      });
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^0x[0-9a-fA-F]{40}$/);
    });
  });

  describe('invalid mode', () => {
    it('should generate invalid financial data', () => {
      const result = strategy.generate({
        mode: 'invalid',
        fieldType: 'iban',
        faker,
      });
      const isInvalid =
        result === 'AB12' ||
        result === '!@#$%^&*()' ||
        result === 'INVALID_FINANCIAL_DATA' ||
        result === 'invalid';
      expect(isInvalid).toBe(true);
    });
  });

  describe('validate', () => {
    it('should validate an Ethereum address format', () => {
      expect(
        strategy.validate('0x1234567890abcdef1234567890abcdef12345678', {
          fieldType: 'ethereumAddress',
        })
      ).toBe(true);
    });

    it('should reject invalid Ethereum address', () => {
      expect(
        strategy.validate('not-an-eth-address', {
          fieldType: 'ethereumAddress',
        })
      ).toBe(false);
    });

    it('should reject non-string values', () => {
      expect(strategy.validate(12345, { fieldType: 'iban' })).toBe(false);
    });
  });
});
