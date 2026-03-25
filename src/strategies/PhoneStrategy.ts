/**
 * Generates phone numbers using locale-aware faker.phone.number({ style }).
 * Supports international, national, and human-readable styles.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';
import { generateFromPattern } from './utils/pattern-helpers.js';

export class PhoneStrategy implements Strategy {
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
        'invalid-chars',
        'no-country-code',
      ]);

      switch (invalidType) {
        case 'too-short':
          return fakerInstance.string.numeric(
            Math.max(3, (constraints.minlength || 10) - 2)
          );
        case 'too-long':
          return fakerInstance.string.numeric(
            (constraints.maxlength || 20) + 5
          );
        case 'invalid-chars':
          return fakerInstance.lorem.word() + fakerInstance.string.numeric(7);
        case 'no-country-code':
          return fakerInstance.string.numeric(10);
        default:
          return 'invalid-phone';
      }
    } else {
      let phone: string;

      if (constraints.pattern) {
        const patternStr = constraints.pattern;

        // Detect style from pattern
        let style: 'international' | 'national' | 'human' = 'human';
        if (patternStr.includes('^\\+') || patternStr.includes('\\+')) {
          style = 'international';
        } else if (patternStr.includes('\\(') || patternStr.includes('(')) {
          style = 'national';
        }

        phone = generateFromPattern(patternStr, fakerInstance, () =>
          fakerInstance.phone.number({ style })
        );
      } else {
        // Default: international style (locale-aware)
        phone = fakerInstance.phone.number({ style: 'international' });
      }

      if (constraints.minlength && phone.length < constraints.minlength) {
        phone = phone + '0'.repeat(constraints.minlength - phone.length);
      }

      if (constraints.maxlength && phone.length > constraints.maxlength) {
        phone = phone.substring(0, constraints.maxlength);
      }

      return phone;
    }
  }

  validate(value: unknown, options: ValueOptions): boolean {
    if (typeof value !== 'string') return false;

    const phone = value as string;
    const { constraints = {} } = options;

    const phoneRegex = /^\+[1-9]\d{1,14}$/;

    if (!phoneRegex.test(phone)) return false;

    if (constraints.minlength && phone.length < constraints.minlength)
      return false;
    if (constraints.maxlength && phone.length > constraints.maxlength)
      return false;

    return true;
  }
}
