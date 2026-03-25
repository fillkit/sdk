import { describe, it, expect } from 'vitest';
import { TokenStrategy } from '../../src/strategies/TokenStrategy.js';
import { faker } from '@faker-js/faker';

describe('TokenStrategy', () => {
  const strategy = new TokenStrategy();

  describe('valid mode', () => {
    it('should generate a JWT token', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'jwt',
        faker,
      });
      expect(typeof result).toBe('string');
      // JWT has 3 parts separated by dots
      const parts = result.split('.');
      expect(parts).toHaveLength(3);
    });

    it('should generate a nanoid', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'nanoid',
        faker,
      });
      expect(typeof result).toBe('string');
      expect(result.length).toBe(21);
    });

    it('should generate a ULID', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'ulid',
        faker,
      });
      expect(typeof result).toBe('string');
      expect(result.length).toBe(26);
      expect(result).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    });

    it('should generate a semver string', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'semver',
        faker,
      });
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('invalid mode', () => {
    it('should generate invalid token data', () => {
      const result = strategy.generate({
        mode: 'invalid',
        fieldType: 'jwt',
        faker,
      });
      const isInvalid =
        result === '' ||
        result === 'not.a.valid.token!!!' ||
        result === 'abc' ||
        result === 'invalid';
      expect(isInvalid).toBe(true);
    });
  });

  describe('validate', () => {
    it('should validate a JWT format', () => {
      const jwt = strategy.generate({
        mode: 'valid',
        fieldType: 'jwt',
        faker,
      });
      expect(strategy.validate(jwt, { fieldType: 'jwt' })).toBe(true);
    });

    it('should validate a semver format', () => {
      expect(strategy.validate('1.2.3', { fieldType: 'semver' })).toBe(true);
    });

    it('should reject invalid semver', () => {
      expect(strategy.validate('not-semver', { fieldType: 'semver' })).toBe(
        false
      );
    });

    it('should reject non-string values', () => {
      expect(strategy.validate(12345, { fieldType: 'jwt' })).toBe(false);
    });
  });
});
