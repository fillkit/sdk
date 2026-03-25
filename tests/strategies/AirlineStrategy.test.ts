import { describe, it, expect } from 'vitest';
import { AirlineStrategy } from '@/strategies/AirlineStrategy.js';
import type { ValueOptions } from '@/types/index.js';

describe('AirlineStrategy', () => {
  const strategy = new AirlineStrategy();

  const makeOptions = (
    fieldType: string,
    mode: 'valid' | 'invalid' = 'valid'
  ): ValueOptions =>
    ({
      fieldType,
      mode,
    }) as ValueOptions;

  describe('valid mode', () => {
    it('generates an airline name', () => {
      const result = strategy.generate(makeOptions('airlineName'));
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('generates a flight number', () => {
      const result = strategy.generate(makeOptions('flightNumber'));
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('generates a seat number', () => {
      const result = strategy.generate(makeOptions('seatNumber'));
      expect(typeof result).toBe('string');
      // Seat numbers like "12A", "3F"
      expect(result).toMatch(/\d+[A-Z]/);
    });

    it('generates an airport code', () => {
      const result = strategy.generate(makeOptions('airportCode'));
      expect(typeof result).toBe('string');
      // IATA codes are 3 uppercase letters
      expect(result).toMatch(/^[A-Z]{3}$/);
    });

    it('generates a record locator', () => {
      const result = strategy.generate(makeOptions('recordLocator'));
      expect(typeof result).toBe('string');
      // Record locators are typically 6 alphanumeric characters
      expect(result).toMatch(/^[A-Z0-9]+$/);
    });

    it('defaults to airline name for unknown fieldType', () => {
      const result = strategy.generate(makeOptions('unknown'));
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('invalid mode', () => {
    it('returns an invalid value', () => {
      const result = strategy.generate(makeOptions('airlineName', 'invalid'));
      expect(['', 'XX', '0000', 'INVALID_FLIGHT']).toContain(result);
    });
  });

  describe('uniqueness', () => {
    it('can generate multiple different airline names', () => {
      const results = new Set<string>();
      for (let i = 0; i < 20; i++) {
        results.add(strategy.generate(makeOptions('airlineName')));
      }
      expect(results.size).toBeGreaterThan(1);
    });
  });
});
