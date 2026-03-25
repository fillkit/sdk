/**
 * Identifier Strategy
 *
 * Generates product identifiers like ISBN, UPC, and SKU codes.
 * Uses faker.commerce.isbn() for valid ISBN-13 with correct check digits.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class IdentifierStrategy implements Strategy {
  generate(options: ValueOptions): string {
    const {
      mode = 'valid',
      fieldType,
      constraints = {},
      faker: fakerInstance = faker,
    } = options;

    if (mode === 'invalid') {
      const invalidType = fakerInstance.helpers.arrayElement([
        'wrong-length',
        'invalid-chars',
        'missing-hyphens',
        'all-zeros',
      ]);

      switch (invalidType) {
        case 'wrong-length':
          return fakerInstance.string.numeric(5);
        case 'invalid-chars':
          return 'ABC-DEF-GHI';
        case 'missing-hyphens':
          return fakerInstance.string.numeric(13).replace(/-/g, '');
        case 'all-zeros':
          return '0000000000000';
        default:
          return 'INVALID';
      }
    } else {
      let identifier: string;

      switch (fieldType) {
        case 'isbn':
          identifier = fakerInstance.commerce.isbn();
          break;

        case 'upc':
          identifier = fakerInstance.string.numeric(12);
          break;

        case 'sku':
          identifier = this.generateSKU(fakerInstance);
          break;

        default:
          identifier = this.generateSKU(fakerInstance);
      }

      if (constraints.pattern) {
        const pattern = new RegExp(constraints.pattern);
        for (let i = 0; i < 10 && !pattern.test(identifier); i++) {
          if (fieldType === 'isbn') {
            identifier = fakerInstance.commerce.isbn();
          } else if (fieldType === 'upc') {
            identifier = fakerInstance.string.numeric(12);
          } else {
            identifier = this.generateSKU(fakerInstance);
          }
        }
      }

      return identifier;
    }
  }

  validate(value: unknown, options: ValueOptions): boolean {
    if (typeof value !== 'string') return false;

    const identifier = value as string;
    const { constraints = {}, fieldType } = options;

    if (fieldType === 'isbn') {
      if (!/^(?:\d{13}|\d{3}-\d-\d{4}-\d{4}-\d)$/.test(identifier))
        return false;
    } else if (fieldType === 'upc') {
      if (!/^\d{12}$/.test(identifier)) return false;
    }

    if (constraints.pattern) {
      const pattern = new RegExp(constraints.pattern);
      if (!pattern.test(identifier)) return false;
    }

    return true;
  }

  private generateSKU(fakerInstance: typeof faker): string {
    const formats = [
      () => {
        const category = fakerInstance.string.alpha(3).toUpperCase();
        const number = fakerInstance.string.numeric(5);
        return `${category}-${number}`;
      },
      () => fakerInstance.string.alphanumeric(9).toUpperCase(),
      () => {
        const cat = fakerInstance.string.alpha(2).toUpperCase();
        const subcat = fakerInstance.string.alpha(2).toUpperCase();
        const id = fakerInstance.string.numeric(4);
        return `${cat}-${subcat}-${id}`;
      },
    ];

    const generator = fakerInstance.helpers.arrayElement(formats);
    return generator();
  }
}
