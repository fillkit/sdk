/**
 * Language/Locale Strategy
 *
 * Generates ISO language codes and locale identifiers using faker.location.language().
 * Full ISO 639 coverage instead of hardcoded arrays.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class LanguageStrategy implements Strategy {
  generate(options: ValueOptions): string {
    const {
      mode = 'valid',
      fieldType,
      constraints = {},
      faker: fakerInstance = faker,
    } = options;

    if (mode === 'invalid') {
      const invalidType = fakerInstance.helpers.arrayElement([
        'too-long',
        'numeric',
        'wrong-format',
        'mixed-case',
      ]);

      switch (invalidType) {
        case 'too-long':
          return fakerInstance.string.alpha(10);
        case 'numeric':
          return fakerInstance.string.numeric(4);
        case 'wrong-format':
          return 'en_US_EXTRA';
        case 'mixed-case':
          return 'EN-us';
        default:
          return 'invalid';
      }
    } else {
      let value: string;

      switch (fieldType) {
        case 'language':
          // ISO 639-1 language code via Faker (full coverage)
          value = fakerInstance.location.language().alpha2;
          break;

        case 'locale': {
          // Compose locale: language-COUNTRY
          const lang = fakerInstance.location.language().alpha2;
          const country = fakerInstance.location.countryCode('alpha-2');
          value = `${lang}-${country}`;
          break;
        }

        default:
          value = fakerInstance.location.language().alpha2;
      }

      if (constraints.pattern) {
        const pattern = new RegExp(constraints.pattern);
        for (let i = 0; i < 10 && !pattern.test(value); i++) {
          if (fieldType === 'locale') {
            const lang = fakerInstance.location.language().alpha2;
            const country = fakerInstance.location.countryCode('alpha-2');
            value = `${lang}-${country}`;
          } else {
            value = fakerInstance.location.language().alpha2;
          }
        }
      }

      return value;
    }
  }

  validate(value: unknown, options: ValueOptions): boolean {
    if (typeof value !== 'string') return false;

    const lang = value as string;
    const { constraints = {}, fieldType } = options;

    if (fieldType === 'language') {
      if (!/^[a-z]{2,3}$/.test(lang)) return false;
    } else if (fieldType === 'locale') {
      if (!/^[a-z]{2,3}-[A-Z]{2}$/.test(lang)) return false;
    }

    if (constraints.pattern) {
      const pattern = new RegExp(constraints.pattern);
      if (!pattern.test(lang)) return false;
    }

    return true;
  }
}
