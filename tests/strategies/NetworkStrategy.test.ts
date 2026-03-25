import { describe, it, expect } from 'vitest';
import { NetworkStrategy } from '../../src/strategies/NetworkStrategy.js';
import { faker } from '@faker-js/faker';

describe('NetworkStrategy', () => {
  const strategy = new NetworkStrategy();

  describe('valid mode', () => {
    it('should generate a valid MAC address with default separator', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'macAddress',
        faker,
      });
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i);
    });

    it('should generate a valid IMEI', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'imei',
        faker,
      });
      expect(typeof result).toBe('string');
      // IMEI from faker includes hyphens (e.g., "58-835121-826394-2")
      expect(result.replace(/-/g, '')).toMatch(/^\d{15}$/);
    });
  });

  describe('invalid mode', () => {
    it('should generate invalid network data', () => {
      const result = strategy.generate({
        mode: 'invalid',
        fieldType: 'macAddress',
        faker,
      });
      const isInvalid =
        result === 'AB:CD' ||
        result === 'ZZ:ZZ:ZZ:ZZ:ZZ:ZZ' ||
        result === 'not-a-mac-or-imei' ||
        result === 'invalid';
      expect(isInvalid).toBe(true);
    });
  });

  describe('validate', () => {
    it('should validate a MAC address', () => {
      expect(
        strategy.validate('00:1A:2B:3C:4D:5E', { fieldType: 'macAddress' })
      ).toBe(true);
    });

    it('should reject invalid MAC address', () => {
      expect(strategy.validate('not-a-mac', { fieldType: 'macAddress' })).toBe(
        false
      );
    });

    it('should validate an IMEI', () => {
      expect(strategy.validate('123456789012345', { fieldType: 'imei' })).toBe(
        true
      );
    });
  });
});
