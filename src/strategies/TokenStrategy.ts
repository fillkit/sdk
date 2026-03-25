/**
 * Token Strategy
 *
 * Generates technical tokens and identifiers like JWT, nanoid, ULID, and semver
 * using native Faker.js methods.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class TokenStrategy implements Strategy {
  generate(options: ValueOptions): string {
    const { mode = 'valid', fieldType, faker: fakerInstance = faker } = options;

    if (mode === 'invalid') {
      const invalidType = fakerInstance.helpers.arrayElement([
        'empty',
        'wrong-format',
        'too-short',
      ]);

      switch (invalidType) {
        case 'empty':
          return '';
        case 'wrong-format':
          return 'not.a.valid.token!!!';
        case 'too-short':
          return 'abc';
        default:
          return 'invalid';
      }
    }

    switch (fieldType) {
      case 'jwt':
        return fakerInstance.internet.jwt();

      case 'nanoid':
        return fakerInstance.string.nanoid();

      case 'ulid':
        return fakerInstance.string.ulid();

      case 'semver':
        return fakerInstance.system.semver();

      default:
        return fakerInstance.string.nanoid();
    }
  }

  validate(value: unknown, options: ValueOptions): boolean {
    if (typeof value !== 'string') return false;

    const { fieldType } = options;

    switch (fieldType) {
      case 'jwt':
        // JWT has 3 base64url parts separated by dots
        return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
      case 'nanoid':
        return value.length === 21;
      case 'ulid':
        return /^[0-9A-HJKMNP-TV-Z]{26}$/.test(value);
      case 'semver':
        return /^\d+\.\d+\.\d+$/.test(value);
      default:
        return value.length > 0;
    }
  }
}
