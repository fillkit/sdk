/**
 * Animal Strategy
 *
 * Generates animal-related data using faker.animal module.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class AnimalStrategy implements Strategy {
  generate(options: ValueOptions): string {
    const { mode = 'valid', fieldType, faker: fakerInstance = faker } = options;

    if (mode === 'invalid') {
      return fakerInstance.helpers.arrayElement(['', '12345', 'InvalidAnimal']);
    }

    switch (fieldType) {
      case 'animalType':
        return fakerInstance.animal.type();

      case 'petName':
        return fakerInstance.animal.petName();

      case 'dogBreed':
        return fakerInstance.animal.dog();

      case 'catBreed':
        return fakerInstance.animal.cat();

      default:
        return fakerInstance.animal.type();
    }
  }

  validate(value: unknown): boolean {
    return typeof value === 'string' && value.length > 0;
  }
}
