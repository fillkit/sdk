/**
 * File Strategy
 *
 * Generates filename, path, MIME type, and extension strings for text inputs.
 * Returns null for actual <input type="file"> elements (can't set file inputs).
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class FileStrategy implements Strategy {
  generate(options: ValueOptions): string | null {
    const { mode = 'valid', element, faker: fakerInstance = faker } = options;

    // Cannot programmatically set file inputs
    if (element?.getAttribute('type') === 'file') {
      return null;
    }

    if (mode === 'invalid') {
      const invalidType = fakerInstance.helpers.arrayElement([
        'path-traversal',
        'null-bytes',
        'too-long',
      ]);

      switch (invalidType) {
        case 'path-traversal':
          return '../../../etc/passwd';
        case 'null-bytes':
          return 'file.txt\0.exe';
        case 'too-long':
          return fakerInstance.string.alpha(256) + '.txt';
        default:
          return '';
      }
    } else {
      const generator = fakerInstance.helpers.arrayElement([
        () => fakerInstance.system.fileName(),
        () => fakerInstance.system.filePath(),
        () => fakerInstance.system.commonFileName(),
      ]);

      return generator();
    }
  }

  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    return value.length > 0;
  }
}
