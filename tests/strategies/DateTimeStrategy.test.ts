import { describe, it, expect } from 'vitest';
import { DateTimeStrategy } from '../../src/strategies/DateTimeStrategy.js';
import { faker } from '@faker-js/faker';

describe('DateTimeStrategy', () => {
  const strategy = new DateTimeStrategy();

  describe('valid mode - birthDate', () => {
    it('should generate birthdate via faker.date.birthdate()', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'birthDate',
        faker,
      });
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      const date = new Date(result);
      const now = new Date();
      const age =
        (now.getTime() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      expect(age).toBeGreaterThanOrEqual(17);
      expect(age).toBeLessThanOrEqual(66);
    });

    it('should respect min/max constraints override', () => {
      const minDate = new Date('2000-01-01').getTime();
      const maxDate = new Date('2005-12-31').getTime();
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'birthDate',
        faker,
        constraints: { min: minDate, max: maxDate },
      });
      const date = new Date(result);
      expect(date.getFullYear()).toBeGreaterThanOrEqual(2000);
      expect(date.getFullYear()).toBeLessThanOrEqual(2005);
    });
  });

  describe('valid mode - weekday', () => {
    it('should generate a weekday name', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'weekday',
        faker,
      });
      const weekdays = [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ];
      expect(weekdays).toContain(result);
    });
  });

  describe('valid mode - monthName', () => {
    it('should generate a month name', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'monthName',
        faker,
      });
      const months = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      expect(months).toContain(result);
    });
  });

  describe('valid mode - date', () => {
    it('should generate date in YYYY-MM-DD format', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'date',
        faker,
      });
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('valid mode - time', () => {
    it('should generate time in HH:MM format', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'time',
        faker,
      });
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  describe('valid mode - age', () => {
    it('should generate age between 18 and 100', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'age',
        faker,
      });
      const age = parseInt(result);
      expect(age).toBeGreaterThanOrEqual(18);
      expect(age).toBeLessThanOrEqual(100);
    });
  });

  describe('invalid mode', () => {
    it('should generate an invalid date value', () => {
      const result = strategy.generate({ mode: 'invalid', faker });
      expect(typeof result).toBe('string');
    });
  });
});
