/**
 * Book Strategy
 *
 * Generates book-related data using faker.book module.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class BookStrategy implements Strategy {
  generate(options: ValueOptions): string {
    const { mode = 'valid', fieldType, faker: fakerInstance = faker } = options;

    if (mode === 'invalid') {
      return fakerInstance.helpers.arrayElement(['', '12345', 'N/A']);
    }

    switch (fieldType) {
      case 'bookTitle':
        return fakerInstance.book.title();

      case 'bookAuthor':
        return fakerInstance.book.author();

      case 'bookGenre':
        return fakerInstance.book.genre();

      case 'bookPublisher':
        return fakerInstance.book.publisher();

      default:
        return fakerInstance.book.title();
    }
  }

  validate(value: unknown): boolean {
    return typeof value === 'string' && value.length > 0;
  }
}
