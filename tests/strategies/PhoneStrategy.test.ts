import { describe, it, expect } from 'vitest';
import { PhoneStrategy } from '../../src/strategies/PhoneStrategy.js';
import { faker } from '@faker-js/faker';

describe('PhoneStrategy', () => {
  const strategy = new PhoneStrategy();

  describe('valid mode', () => {
    it('should generate international-style phone by default', () => {
      const result = strategy.generate({ mode: 'valid', faker });
      // International style starts with +
      expect(result).toMatch(/^\+/);
    });

    it('should generate locale-aware phone numbers', () => {
      const phones = new Set<string>();
      for (let i = 0; i < 20; i++) {
        phones.add(strategy.generate({ mode: 'valid', faker }));
      }
      expect(phones.size).toBeGreaterThan(1);
    });
  });

  describe('invalid mode', () => {
    it('should generate an invalid phone number', () => {
      const result = strategy.generate({ mode: 'invalid', faker });
      expect(typeof result).toBe('string');
    });
  });

  describe('validate', () => {
    it('should accept E.164 format', () => {
      expect(strategy.validate('+14155552671', { constraints: {} })).toBe(true);
    });

    it('should reject without + prefix', () => {
      expect(strategy.validate('14155552671', { constraints: {} })).toBe(false);
    });
  });
});
