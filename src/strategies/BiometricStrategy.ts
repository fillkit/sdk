/**
 * Biometric/Health Strategy
 *
 * Generates biometric and health-related data like height, weight, and blood type.
 * Uses weighted distributions for realistic blood type frequency.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class BiometricStrategy implements Strategy {
  private readonly bloodTypeDistribution: Array<{
    value: string;
    weight: number;
  }> = [
    { value: 'O+', weight: 38 },
    { value: 'A+', weight: 27 },
    { value: 'B+', weight: 9 },
    { value: 'O-', weight: 7 },
    { value: 'A-', weight: 6 },
    { value: 'AB+', weight: 5 },
    { value: 'AB-', weight: 4 },
    { value: 'B-', weight: 4 },
  ];

  generate(options: ValueOptions): string | number {
    const {
      mode = 'valid',
      fieldType,
      constraints = {},
      faker: fakerInstance = faker,
    } = options;

    if (mode === 'invalid') {
      const invalidType = fakerInstance.helpers.arrayElement([
        'out-of-range',
        'negative',
        'non-numeric',
        'invalid-format',
      ]);

      switch (invalidType) {
        case 'out-of-range':
          return fieldType === 'height' ? 500 : 1000;
        case 'negative':
          return -10;
        case 'non-numeric':
          return 'invalid';
        case 'invalid-format':
          return fieldType === 'bloodType' ? 'XY+' : 'abc';
        default:
          return 'invalid';
      }
    } else {
      let value: string | number;

      switch (fieldType) {
        case 'height': {
          const minHeight = constraints.min || 150;
          const maxHeight = constraints.max || 200;
          value = fakerInstance.number.int({ min: minHeight, max: maxHeight });
          break;
        }

        case 'weight': {
          const minWeight = constraints.min || 50;
          const maxWeight = constraints.max || 120;
          value = fakerInstance.number.int({ min: minWeight, max: maxWeight });
          break;
        }

        case 'bloodType':
          value = fakerInstance.helpers.weightedArrayElement(
            this.bloodTypeDistribution
          );
          break;

        default:
          value = fakerInstance.number.int({ min: 0, max: 100 });
      }

      if (typeof value === 'string' && constraints.pattern) {
        const pattern = new RegExp(constraints.pattern);
        for (let i = 0; i < 10 && !pattern.test(value); i++) {
          if (fieldType === 'bloodType') {
            value = fakerInstance.helpers.weightedArrayElement(
              this.bloodTypeDistribution
            );
          }
        }
      }

      return value;
    }
  }

  validate(value: unknown, options: ValueOptions): boolean {
    const { constraints = {}, fieldType } = options;

    if (fieldType === 'bloodType') {
      if (typeof value !== 'string') return false;
      const validTypes = this.bloodTypeDistribution.map(bt => bt.value);
      if (!validTypes.includes(value)) return false;
    } else {
      if (typeof value !== 'number') return false;
      const numValue = value as number;
      if (constraints.min !== undefined && numValue < constraints.min)
        return false;
      if (constraints.max !== undefined && numValue > constraints.max)
        return false;
    }

    if (typeof value === 'string' && constraints.pattern) {
      const pattern = new RegExp(constraints.pattern);
      if (!pattern.test(value)) return false;
    }

    return true;
  }
}
