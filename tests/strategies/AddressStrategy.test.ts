import { describe, it, expect } from 'vitest';
import { AddressStrategy } from '../../src/strategies/AddressStrategy.js';
import { faker } from '@faker-js/faker';

describe('AddressStrategy', () => {
  const strategy = new AddressStrategy();

  describe('valid mode - address.line2', () => {
    it('should use faker.location.secondaryAddress()', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'address.line2',
        faker,
      });
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('valid mode - buildingNumber', () => {
    it('should generate a building number', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'buildingNumber',
        faker,
      });
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('valid mode - street', () => {
    it('should generate a street name', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'street',
        faker,
      });
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('valid mode - continent', () => {
    it('should generate a continent name', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'continent',
        faker,
      });
      const continents = [
        'Africa',
        'Antarctica',
        'Asia',
        'Australia',
        'Europe',
        'North America',
        'South America',
      ];
      expect(continents).toContain(result);
    });
  });

  describe('valid mode - existing types', () => {
    it('should generate city', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'city',
        faker,
      });
      expect(result.length).toBeGreaterThan(0);
    });

    it('should generate country', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'country',
        faker,
      });
      expect(result.length).toBeGreaterThan(0);
    });

    it('should generate latitude as numeric string', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'latitude',
        faker,
      });
      const lat = parseFloat(result);
      expect(lat).toBeGreaterThanOrEqual(-90);
      expect(lat).toBeLessThanOrEqual(90);
    });
  });

  describe('invalid mode', () => {
    it('should generate an invalid address', () => {
      const result = strategy.generate({ mode: 'invalid', faker });
      expect(typeof result).toBe('string');
    });
  });
});
