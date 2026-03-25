/**
 * Range Strategy
 *
 * Generates values for input[type="range"] slider controls.
 * Respects min/max/step constraints from the element.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class RangeStrategy implements Strategy {
  generate(options: ValueOptions): number {
    const {
      mode = 'valid',
      constraints = {},
      faker: fakerInstance = faker,
    } = options;

    const min = constraints.min ?? 0;
    const max = constraints.max ?? 100;
    const step = constraints.step ?? 1;

    if (mode === 'invalid') {
      // For range inputs, browsers typically clamp values automatically
      // Generate step mismatches as the primary invalid case
      const invalidTypes = ['step-mismatch', 'decimal-for-integer-step'];
      const invalidType = fakerInstance.helpers.arrayElement(invalidTypes);

      switch (invalidType) {
        case 'step-mismatch':
          // Generate value that doesn't align with step
          const baseValue = fakerInstance.number.int({ min, max });
          return baseValue + step * 0.33; // Fraction of step
        case 'decimal-for-integer-step':
          // When step is an integer, add decimal
          if (step === Math.floor(step)) {
            return fakerInstance.number.float({ min, max, fractionDigits: 2 });
          }
          return min + (max - min) * Math.random();
        default:
          return min + (max - min) * Math.random();
      }
    }

    // Generate valid value within range, respecting step
    const range = max - min;
    const steps = Math.floor(range / step);
    const randomStep = fakerInstance.number.int({ min: 0, max: steps });

    return min + randomStep * step;
  }

  validate(value: unknown, options: ValueOptions): boolean {
    if (typeof value !== 'number' || isNaN(value)) return false;

    const { constraints = {} } = options;
    const min = constraints.min ?? 0;
    const max = constraints.max ?? 100;
    const step = constraints.step ?? 1;

    // Check range
    if (value < min || value > max) return false;

    // Check step alignment
    const remainder = (value - min) % step;
    return Math.abs(remainder) < 0.0001; // Allow small floating point errors
  }
}
