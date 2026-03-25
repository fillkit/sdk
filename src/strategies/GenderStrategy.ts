/**
 * Gender Strategy
 *
 * Generates gender and sex values using faker.person.gender()/sex().
 * Locale-aware inclusive gender identities.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class GenderStrategy implements Strategy {
  generate(options: ValueOptions): string {
    const { mode = 'valid', fieldType, faker: fakerInstance = faker } = options;

    if (mode === 'invalid') {
      const invalidType = fakerInstance.helpers.arrayElement([
        'numeric',
        'too-long',
        'special-chars',
      ]);

      switch (invalidType) {
        case 'numeric':
          return fakerInstance.string.numeric(3);
        case 'too-long':
          return fakerInstance.lorem.paragraph();
        case 'special-chars':
          return '<script>alert(1)</script>';
        default:
          return '';
      }
    } else {
      switch (fieldType) {
        case 'sex':
          return fakerInstance.person.sex();
        case 'gender':
        default:
          return fakerInstance.person.gender();
      }
    }
  }

  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    return value.length > 0 && value.length <= 50;
  }
}
