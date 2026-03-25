/**
 * Number Strategy
 *
 * Generates numeric values using comprehensive Faker.js number and datatype API.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class NumberStrategy implements Strategy {
  generate(options: ValueOptions): number {
    const {
      mode = 'valid',
      constraints = {},
      fieldType,
      faker: fakerInstance = faker,
    } = options;

    const min = constraints.min ?? 0;
    const max = constraints.max ?? 100;
    const step = constraints.step ?? 1;

    if (mode === 'invalid') {
      // Generate invalid numbers
      const invalidTypes = ['below-min', 'above-max', 'wrong-step'];
      const invalidType = fakerInstance.helpers.arrayElement(invalidTypes);

      switch (invalidType) {
        case 'below-min':
          return min - Math.abs(fakerInstance.number.int({ min: 1, max: 10 }));
        case 'above-max':
          return max + Math.abs(fakerInstance.number.int({ min: 1, max: 10 }));
        case 'wrong-step':
          // Generate number that doesn't follow step
          const baseValue = fakerInstance.number.int({ min, max });
          return baseValue + step / 2; // Half step should be invalid
        default:
          return NaN;
      }
    } else {
      // Generate valid numbers based on field type
      switch (fieldType) {
        case 'percentage':
          return fakerInstance.number.int({
            min: constraints.min ?? 0,
            max: constraints.max ?? 100,
          });

        case 'decimal':
          // Generate realistic decimal numbers (only when explicitly decimal)
          return fakerInstance.number.float({
            min: constraints.min ?? 0,
            max: constraints.max ?? 1000,
            fractionDigits: 2,
          });

        case 'integer':
        case 'number.generic':
          // Generate integers by default
          return fakerInstance.number.int({
            min: constraints.min ?? 0,
            max: constraints.max ?? 10000,
          });

        case 'currency':
          return parseFloat(
            fakerInstance.finance.amount({
              min: constraints.min ?? 1,
              max: constraints.max ?? 10000,
              dec: 2,
            })
          );

        default:
          // Generate valid integer within constraints with step support
          // If step is defined and it's a decimal (like 0.01), generate float
          if (step < 1) {
            const range = max - min;
            const steps = Math.floor(range / step);
            const randomStep = fakerInstance.number.int({ min: 0, max: steps });
            return parseFloat((min + randomStep * step).toFixed(2));
          }
          // Otherwise generate integer
          const range = max - min;
          const steps = Math.floor(range / step);
          const randomStep = fakerInstance.number.int({ min: 0, max: steps });
          return min + randomStep * step;
      }
    }
  }

  validate(value: unknown, options: ValueOptions): boolean {
    if (typeof value !== 'number' || isNaN(value)) return false;

    const num = value as number;
    const { constraints = {} } = options;

    if (constraints.min !== undefined && num < constraints.min) return false;
    if (constraints.max !== undefined && num > constraints.max) return false;

    if (constraints.step !== undefined) {
      const min = constraints.min ?? 0;
      const remainder = (num - min) % constraints.step;
      if (Math.abs(remainder) > 0.0001) return false; // Allow small floating point errors
    }

    return true;
  }
}
