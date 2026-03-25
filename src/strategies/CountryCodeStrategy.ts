/**
 * Country Code Strategy
 *
 * Generates ISO 3166-1 country codes using faker.location.countryCode().
 * Supports alpha-2, alpha-3, and numeric formats.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class CountryCodeStrategy implements Strategy {
  generate(options: ValueOptions): string {
    const {
      mode = 'valid',
      constraints = {},
      faker: fakerInstance = faker,
    } = options;

    if (mode === 'invalid') {
      const invalidType = fakerInstance.helpers.arrayElement([
        'too-long',
        'numeric-alpha',
        'lowercase',
        'empty',
      ]);

      switch (invalidType) {
        case 'too-long':
          return fakerInstance.string.alpha(5).toUpperCase();
        case 'numeric-alpha':
          return fakerInstance.string.alphanumeric(3);
        case 'lowercase':
          return fakerInstance.location.countryCode('alpha-2').toLowerCase();
        case 'empty':
          return '';
        default:
          return 'INVALID';
      }
    } else {
      // Determine format from maxlength constraint or pattern
      const maxLength = constraints.maxlength || 2;
      const isNumeric = constraints.pattern && /\\d/.test(constraints.pattern);

      let code: string;
      if (isNumeric) {
        code = fakerInstance.location.countryCode('numeric');
      } else if (maxLength <= 2) {
        code = fakerInstance.location.countryCode('alpha-2');
      } else if (maxLength === 3) {
        code = fakerInstance.location.countryCode('alpha-3');
      } else {
        code = fakerInstance.location.countryCode('alpha-2');
      }

      if (constraints.pattern) {
        const pattern = new RegExp(constraints.pattern);
        for (let i = 0; i < 10 && !pattern.test(code); i++) {
          if (isNumeric) {
            code = fakerInstance.location.countryCode('numeric');
          } else if (maxLength === 3) {
            code = fakerInstance.location.countryCode('alpha-3');
          } else {
            code = fakerInstance.location.countryCode('alpha-2');
          }
        }
      }

      return code;
    }
  }

  validate(value: unknown, options: ValueOptions): boolean {
    if (typeof value !== 'string') return false;

    const code = value as string;
    const { constraints = {} } = options;

    // Alpha-2, alpha-3 uppercase, or numeric (3 digits)
    if (!/^([A-Z]{2,3}|\d{3})$/.test(code)) return false;

    if (constraints.pattern) {
      const pattern = new RegExp(constraints.pattern);
      if (!pattern.test(code)) return false;
    }

    return true;
  }
}
