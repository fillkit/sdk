/**
 * Food Strategy
 *
 * Generates food-related data using faker.food module.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class FoodStrategy implements Strategy {
  generate(options: ValueOptions): string {
    const { mode = 'valid', fieldType, faker: fakerInstance = faker } = options;

    if (mode === 'invalid') {
      return fakerInstance.helpers.arrayElement([
        '',
        '12345',
        '<script>alert("xss")</script>',
      ]);
    }

    switch (fieldType) {
      case 'foodDish':
        return fakerInstance.food.dish();

      case 'foodIngredient':
        return fakerInstance.food.ingredient();

      case 'foodDescription':
        return fakerInstance.food.description();

      case 'cuisineType':
        return fakerInstance.food.ethnicCategory();

      default:
        return fakerInstance.food.dish();
    }
  }

  validate(value: unknown): boolean {
    return typeof value === 'string' && value.length > 0;
  }
}
