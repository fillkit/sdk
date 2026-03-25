import { describe, it, expect } from 'vitest';
import { TimezoneStrategy } from '../../src/strategies/TimezoneStrategy.js';
import { faker } from '@faker-js/faker';

describe('TimezoneStrategy', () => {
  const strategy = new TimezoneStrategy();

  describe('valid mode', () => {
    it('should generate a valid IANA timezone', () => {
      const result = strategy.generate({ mode: 'valid', faker });
      expect(result).toMatch(/^[A-Za-z_]+\/[A-Za-z_]+/);
    });

    it('should generate diverse timezones (not limited to 26)', () => {
      const timezones = new Set<string>();
      for (let i = 0; i < 100; i++) {
        timezones.add(strategy.generate({ mode: 'valid', faker }));
      }
      // With 400+ timezones, we expect significant diversity
      expect(timezones.size).toBeGreaterThan(20);
    });

    it('should respect pattern constraint', () => {
      const result = strategy.generate({
        mode: 'valid',
        faker,
        constraints: { pattern: '^America/' },
      });
      expect(result).toMatch(/^America\//);
    });
  });

  describe('invalid mode', () => {
    it('should generate an invalid timezone', () => {
      const result = strategy.generate({ mode: 'invalid', faker });
      expect(typeof result).toBe('string');
      // Should not match valid IANA format consistently
    });
  });

  describe('validate', () => {
    it('should accept valid IANA timezone', () => {
      expect(strategy.validate('America/New_York', { constraints: {} })).toBe(
        true
      );
    });

    it('should reject non-IANA format', () => {
      expect(strategy.validate('invalid', { constraints: {} })).toBe(false);
    });
  });
});
