/**
 * Image Strategy
 *
 * Generates image URL strings for text inputs (avatar, portrait, generic).
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class ImageStrategy implements Strategy {
  generate(options: ValueOptions): string {
    const { mode = 'valid', faker: fakerInstance = faker } = options;

    if (mode === 'invalid') {
      const invalidType = fakerInstance.helpers.arrayElement([
        'no-protocol',
        'not-image',
        'xss',
      ]);

      switch (invalidType) {
        case 'no-protocol':
          return 'image.jpg';
        case 'not-image':
          return 'https://example.com/not-an-image.exe';
        case 'xss':
          return 'javascript:alert(1)';
        default:
          return '';
      }
    } else {
      const generator = fakerInstance.helpers.arrayElement([
        () => fakerInstance.image.url(),
        () => fakerInstance.image.avatar(),
        () => fakerInstance.image.personPortrait(),
      ]);

      return generator();
    }
  }

  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
      return false;
    }
  }
}
