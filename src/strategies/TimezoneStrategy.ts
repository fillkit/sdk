/**
 * Timezone Strategy
 *
 * Generates IANA timezone identifiers for timezone selection fields.
 * Uses faker.location.timeZone() for comprehensive coverage (400+ timezones).
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class TimezoneStrategy implements Strategy {
  generate(options: ValueOptions): string {
    const {
      mode = 'valid',
      constraints = {},
      faker: fakerInstance = faker,
    } = options;

    if (mode === 'invalid') {
      const invalidType = fakerInstance.helpers.arrayElement([
        'non-existent',
        'wrong-format',
        'numeric-only',
        'with-spaces',
      ]);

      switch (invalidType) {
        case 'non-existent':
          return 'Invalid/Timezone';
        case 'wrong-format':
          return fakerInstance.lorem.word().toLowerCase();
        case 'numeric-only':
          return fakerInstance.string.numeric(4);
        case 'with-spaces':
          return 'America New York';
        default:
          return 'invalid-timezone';
      }
    } else {
      let timezone = fakerInstance.location.timeZone();

      if (constraints.pattern) {
        const pattern = new RegExp(constraints.pattern);
        for (let i = 0; i < 100 && !pattern.test(timezone); i++) {
          timezone = fakerInstance.location.timeZone();
        }
      }

      return timezone;
    }
  }

  validate(value: unknown, options: ValueOptions): boolean {
    if (typeof value !== 'string') return false;

    const timezone = value as string;
    const { constraints = {} } = options;

    // Basic IANA timezone format validation
    if (!/^[A-Za-z_]+\/[A-Za-z_]+$/.test(timezone)) return false;

    if (constraints.pattern) {
      const pattern = new RegExp(constraints.pattern);
      if (!pattern.test(timezone)) return false;
    }

    return true;
  }
}
