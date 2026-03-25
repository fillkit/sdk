/**
 * Credit Card Strategy
 *
 * Generates credit card numbers, CVV, and expiration dates using Faker.js finance API.
 * Uses faker.finance.creditCardIssuer() for realistic issuer distribution.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class CreditCardStrategy implements Strategy {
  generate(options: ValueOptions): string {
    const { mode = 'valid', fieldType, faker: fakerInstance = faker } = options;

    if (mode === 'invalid') {
      const invalidType = fakerInstance.helpers.arrayElement([
        'too-short',
        'too-long',
        'invalid-chars',
        'invalid-luhn',
      ]);

      switch (invalidType) {
        case 'too-short':
          return fakerInstance.string.numeric(10);
        case 'too-long':
          return fakerInstance.string.numeric(20);
        case 'invalid-chars':
          return fakerInstance.lorem.word() + fakerInstance.string.numeric(10);
        case 'invalid-luhn':
          return '4111111111111112'; // Invalid Luhn checksum
        default:
          return 'invalid-card';
      }
    } else {
      switch (fieldType) {
        case 'creditCard.number': {
          const issuer = fakerInstance.helpers.weightedArrayElement([
            { value: 'visa', weight: 50 },
            { value: 'mastercard', weight: 25 },
            { value: 'american_express', weight: 10 },
            { value: 'discover', weight: 8 },
            { value: 'jcb', weight: 4 },
            { value: 'diners_club', weight: 3 },
          ]);
          return fakerInstance.finance.creditCardNumber({ issuer });
        }

        case 'creditCard.cvv':
          return fakerInstance.finance.creditCardCVV();

        case 'creditCard.expMonth':
          return fakerInstance.number
            .int({ min: 1, max: 12 })
            .toString()
            .padStart(2, '0');

        case 'creditCard.expYear': {
          const currentYear = new Date().getFullYear();
          return fakerInstance.number
            .int({ min: currentYear, max: currentYear + 10 })
            .toString();
        }

        case 'creditCard.expiry': {
          const month = fakerInstance.number
            .int({ min: 1, max: 12 })
            .toString()
            .padStart(2, '0');
          const year = fakerInstance.number
            .int({
              min: new Date().getFullYear(),
              max: new Date().getFullYear() + 10,
            })
            .toString()
            .slice(-2);
          return `${month}/${year}`;
        }

        case 'accountNumber':
          return fakerInstance.finance.accountNumber();

        case 'routingNumber':
          return fakerInstance.finance.routingNumber();

        case 'bankName':
          return fakerInstance.company.name() + ' Bank';

        case 'currency':
          return fakerInstance.finance.amount({ min: 1, max: 10000, dec: 2 });

        default:
          return fakerInstance.finance.creditCardNumber();
      }
    }
  }

  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;

    const cardNumber = value as string;

    const cardRegex = /^\d{13,19}$/;
    if (!cardRegex.test(cardNumber)) return false;

    return this.validateLuhn(cardNumber);
  }

  private validateLuhn(cardNumber: string): boolean {
    let sum = 0;
    let isEven = false;

    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber[i]);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }
}
