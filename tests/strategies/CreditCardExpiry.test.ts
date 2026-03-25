import { describe, it, expect } from 'vitest';
import { CreditCardStrategy } from '../../src/strategies/CreditCardStrategy.js';
import { faker } from '@faker-js/faker';

describe('CreditCardStrategy — creditCard.expiry', () => {
  const strategy = new CreditCardStrategy();

  it('should generate MM/YY format for creditCard.expiry', () => {
    const result = strategy.generate({
      mode: 'valid',
      fieldType: 'creditCard.expiry',
      faker,
    });
    expect(result).toMatch(/^\d{2}\/\d{2}$/);
  });

  it('should generate a future expiry date', () => {
    const result = strategy.generate({
      mode: 'valid',
      fieldType: 'creditCard.expiry',
      faker,
    });
    const [month, year] = result.split('/').map(Number);
    expect(month).toBeGreaterThanOrEqual(1);
    expect(month).toBeLessThanOrEqual(12);

    const fullYear = 2000 + year;
    const currentYear = new Date().getFullYear();
    expect(fullYear).toBeGreaterThanOrEqual(currentYear);
    expect(fullYear).toBeLessThanOrEqual(currentYear + 10);
  });

  it('should pad single-digit months with leading zero', () => {
    const results = new Set<string>();
    for (let i = 0; i < 50; i++) {
      results.add(
        strategy.generate({
          mode: 'valid',
          fieldType: 'creditCard.expiry',
          faker,
        })
      );
    }
    for (const r of results) {
      const month = r.split('/')[0];
      expect(month).toHaveLength(2);
    }
  });

  it('should generate unique values across calls', () => {
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) {
      results.add(
        strategy.generate({
          mode: 'valid',
          fieldType: 'creditCard.expiry',
          faker,
        })
      );
    }
    expect(results.size).toBeGreaterThan(1);
  });
});
