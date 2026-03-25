/**
 * Search Strategy
 *
 * Generates realistic search queries using natural word/commerce data
 * instead of lorem ipsum fallback.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class SearchStrategy implements Strategy {
  generate(options: ValueOptions): string {
    const {
      mode = 'valid',
      constraints = {},
      faker: fakerInstance = faker,
    } = options;

    if (mode === 'invalid') {
      const invalidType = fakerInstance.helpers.arrayElement([
        'xss',
        'sql-injection',
        'too-long',
      ]);

      switch (invalidType) {
        case 'xss':
          return '<script>alert("xss")</script>';
        case 'sql-injection':
          return "'; DROP TABLE users; --";
        case 'too-long':
          return fakerInstance.lorem.paragraphs(5);
        default:
          return '';
      }
    } else {
      const generator = fakerInstance.helpers.arrayElement([
        () =>
          fakerInstance.word.words(
            fakerInstance.number.int({ min: 1, max: 3 })
          ),
        () => fakerInstance.commerce.productName(),
        () => fakerInstance.commerce.product(),
        () => fakerInstance.word.noun(),
      ]);

      let query = generator();

      if (constraints.maxlength && query.length > constraints.maxlength) {
        query = query.substring(0, constraints.maxlength);
      }

      return query;
    }
  }

  validate(value: unknown, options: ValueOptions): boolean {
    if (typeof value !== 'string') return false;

    const { constraints = {} } = options;

    if (constraints.maxlength && value.length > constraints.maxlength)
      return false;

    return value.length > 0;
  }
}
