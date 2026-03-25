/**
 * Science Strategy
 *
 * Generates science-related data using faker.science module.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class ScienceStrategy implements Strategy {
  generate(options: ValueOptions): string {
    const { mode = 'valid', fieldType, faker: fakerInstance = faker } = options;

    if (mode === 'invalid') {
      return fakerInstance.helpers.arrayElement([
        '',
        'Unobtanium',
        'InvalidUnit',
      ]);
    }

    switch (fieldType) {
      case 'chemicalElement': {
        const element = fakerInstance.science.chemicalElement();
        return element.name;
      }

      case 'scienceUnit': {
        const unit = fakerInstance.science.unit();
        return `${unit.name} (${unit.symbol})`;
      }

      default: {
        const el = fakerInstance.science.chemicalElement();
        return el.name;
      }
    }
  }

  validate(value: unknown): boolean {
    return typeof value === 'string' && value.length > 0;
  }
}
