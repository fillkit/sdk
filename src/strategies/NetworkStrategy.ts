/**
 * Network Strategy
 *
 * Generates network/hardware identifiers like MAC addresses and IMEI numbers
 * using native Faker.js methods.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class NetworkStrategy implements Strategy {
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
          return 'AB:CD';
        case 'invalid-chars':
          return 'ZZ:ZZ:ZZ:ZZ:ZZ:ZZ';
        case 'wrong-format':
          return 'not-a-mac-or-imei';
        default:
          return 'invalid';
      }
    }

    switch (fieldType) {
      case 'macAddress':
        return fakerInstance.internet.mac();

      case 'imei':
        return fakerInstance.phone.imei();

      default:
        return fakerInstance.internet.mac();
    }
  }

  validate(value: unknown, options: ValueOptions): boolean {
    if (typeof value !== 'string') return false;

    const { fieldType } = options;

    switch (fieldType) {
      case 'macAddress':
        return /^([0-9A-Fa-f]{2}[:\-.]){5}[0-9A-Fa-f]{2}$/.test(value);
      case 'imei':
        return /^\d{15}$/.test(value.replace(/-/g, ''));
      default:
        return value.length > 0;
    }
  }
}
