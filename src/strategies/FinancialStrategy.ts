/**
 * Financial Strategy
 *
 * Generates financial identifiers like IBAN, BIC/SWIFT, and crypto addresses
 * using native Faker.js finance methods.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class FinancialStrategy implements Strategy {
  generate(options: ValueOptions): string {
    const { mode = 'valid', fieldType, faker: fakerInstance = faker } = options;

    if (mode === 'invalid') {
      const invalidType = fakerInstance.helpers.arrayElement([
        'too-short',
        'invalid-chars',
        'wrong-format',
      ]);

      switch (invalidType) {
        case 'too-short':
          return 'AB12';
        case 'invalid-chars':
          return '!@#$%^&*()';
        case 'wrong-format':
          return 'INVALID_FINANCIAL_DATA';
        default:
          return 'invalid';
      }
    }

    switch (fieldType) {
      case 'iban':
        return fakerInstance.finance.iban();

      case 'bic':
        return fakerInstance.finance.bic();

      case 'bitcoinAddress':
        return fakerInstance.finance.bitcoinAddress();

      case 'ethereumAddress':
        return fakerInstance.finance.ethereumAddress();

      default:
        return fakerInstance.finance.iban();
    }
  }

  validate(value: unknown, options: ValueOptions): boolean {
    if (typeof value !== 'string') return false;

    const { fieldType } = options;

    switch (fieldType) {
      case 'iban':
        return /^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/.test(value);
      case 'bic':
        return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(value);
      case 'bitcoinAddress':
        return value.length >= 25 && value.length <= 62;
      case 'ethereumAddress':
        return /^0x[0-9a-fA-F]{40}$/.test(value);
      default:
        return value.length > 0;
    }
  }
}
