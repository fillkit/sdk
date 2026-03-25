import { describe, it, expect } from 'vitest';
import { VehicleStrategy } from '../../src/strategies/VehicleStrategy.js';
import { faker } from '@faker-js/faker';

describe('VehicleStrategy', () => {
  const strategy = new VehicleStrategy();

  describe('valid mode - vin', () => {
    it('should generate a valid 17-character VIN via faker.vehicle.vin()', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'vin',
        faker,
      });
      expect(result).toMatch(/^[A-HJ-NPR-Z0-9]{17}$/);
    });

    it('should not contain I, O, or Q', () => {
      for (let i = 0; i < 20; i++) {
        const vin = strategy.generate({
          mode: 'valid',
          fieldType: 'vin',
          faker,
        });
        expect(vin).not.toMatch(/[IOQ]/);
      }
    });
  });

  describe('valid mode - licensePlate', () => {
    it('should generate a license plate string', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'licensePlate',
        faker,
      });
      expect(result.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('invalid mode', () => {
    it('should generate an invalid vehicle identifier', () => {
      const result = strategy.generate({ mode: 'invalid', faker });
      expect(typeof result).toBe('string');
    });
  });

  describe('validate', () => {
    it('should accept valid VIN', () => {
      const vin = strategy.generate({
        mode: 'valid',
        fieldType: 'vin',
        faker,
      });
      expect(
        strategy.validate(vin, { fieldType: 'vin', constraints: {} })
      ).toBe(true);
    });

    it('should reject short VIN', () => {
      expect(
        strategy.validate('ABC123', { fieldType: 'vin', constraints: {} })
      ).toBe(false);
    });
  });

  describe('valid mode - vehicle details', () => {
    it('should generate a vehicle make', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'vehicleMake',
        faker,
      });
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should generate a vehicle model', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'vehicleModel',
        faker,
      });
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should generate a vehicle type', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'vehicleType',
        faker,
      });
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should generate a vehicle fuel type', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'vehicleFuel',
        faker,
      });
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should generate a vehicle color', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'vehicleColor',
        faker,
      });
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
