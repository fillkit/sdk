import { describe, it, expect } from 'vitest';
import { OTPPinStrategy } from '../../src/strategies/OTPPinStrategy.js';
import { faker } from '@faker-js/faker';

describe('OTPPinStrategy', () => {
  const strategy = new OTPPinStrategy();

  describe('valid mode - pinCode', () => {
    it('should generate a 4-digit PIN via faker.finance.pin()', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'pinCode',
        faker,
      });
      expect(result).toMatch(/^\d{4}$/);
    });

    it('should respect custom length constraints', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'pinCode',
        faker,
        constraints: { minlength: 6, maxlength: 6 },
      });
      expect(result).toMatch(/^\d{6}$/);
    });
  });

  describe('valid mode - otpCode', () => {
    it('should generate a 6-digit OTP', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'otpCode',
        faker,
      });
      expect(result).toMatch(/^\d{6}$/);
    });
  });

  describe('valid mode - verificationCode', () => {
    it('should generate a 6-digit verification code', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'verificationCode',
        faker,
      });
      expect(result).toMatch(/^\d{6}$/);
    });
  });

  describe('invalid mode', () => {
    it('should generate an invalid OTP/PIN', () => {
      const result = strategy.generate({ mode: 'invalid', faker });
      expect(typeof result).toBe('string');
    });
  });

  describe('validate', () => {
    it('should accept valid numeric code', () => {
      expect(strategy.validate('1234', { constraints: {} })).toBe(true);
    });

    it('should reject non-numeric', () => {
      expect(strategy.validate('abcd', { constraints: {} })).toBe(false);
    });
  });
});
