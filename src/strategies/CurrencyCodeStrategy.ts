/**
 * Currency Code Strategy
 *
 * Generates ISO 4217 currency codes using faker.finance.currencyCode().
 * 160+ currencies instead of 20 hardcoded entries.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class CurrencyCodeStrategy implements Strategy {
  generate(options: ValueOptions): string {
    const {
      mode = 'valid',
      constraints = {},
      faker: fakerInstance = faker,
    } = options;

    if (mode === 'invalid') {
      const invalidType = fakerInstance.helpers.arrayElement([
        'too-short',
        'too-long',
        'lowercase',
        'numeric',
        'non-existent',
      ]);

      switch (invalidType) {
        case 'too-short':
          return fakerInstance.string.alpha(2).toUpperCase();
        case 'too-long':
          return fakerInstance.string.alpha(4).toUpperCase();
        case 'lowercase':
          return fakerInstance.finance.currencyCode().toLowerCase();
        case 'numeric':
          return fakerInstance.string.numeric(3);
        case 'non-existent':
          return 'XXX';
        default:
          return 'INVALID';
      }
    } else {
      let currencyCode = fakerInstance.finance.currencyCode();

      if (constraints.pattern) {
        const pattern = new RegExp(constraints.pattern);
        for (let i = 0; i < 10 && !pattern.test(currencyCode); i++) {
          currencyCode = fakerInstance.finance.currencyCode();
        }
      }

      return currencyCode;
    }
  }

  validate(value: unknown, options: ValueOptions): boolean {
    if (typeof value !== 'string') return false;

    const code = value as string;
    const { constraints = {} } = options;

    if (!/^[A-Z]{3}$/.test(code)) return false;

    if (constraints.pattern) {
      const pattern = new RegExp(constraints.pattern);
      if (!pattern.test(code)) return false;
    }

    return true;
  }
}
