/**
 * Color Strategy
 *
 * Generates color values for input[type="color"] elements.
 * HTML5 color inputs require hex color format: #RRGGBB
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class ColorStrategy implements Strategy {
  generate(options: ValueOptions): string {
    const {
      mode = 'valid',
      constraints = {},
      faker: fakerInstance = faker,
    } = options;

    if (mode === 'invalid') {
      // Generate invalid color values
      const invalidTypes = [
        'no-hash',
        'wrong-length',
        'invalid-chars',
        'uppercase-only',
      ];
      const invalidType = fakerInstance.helpers.arrayElement(invalidTypes);

      switch (invalidType) {
        case 'no-hash':
          return fakerInstance.color.rgb().replace('#', ''); // Missing # prefix
        case 'wrong-length':
          return '#' + fakerInstance.string.hexadecimal({ length: 4 }); // Wrong length
        case 'invalid-chars':
          return '#' + fakerInstance.lorem.word().substring(0, 6); // Non-hex chars
        case 'uppercase-only':
          return fakerInstance.color.rgb().toUpperCase(); // Color inputs want lowercase
        default:
          return 'invalid-color';
      }
    } else {
      // Generate valid hex color in #rrggbb format (lowercase)
      let color = fakerInstance.color.rgb({ format: 'hex' });

      // Ensure lowercase format (HTML5 color input standard)
      color = color.toLowerCase();

      // If pattern constraint exists, try to match it
      if (constraints.pattern) {
        const pattern = new RegExp(constraints.pattern);
        // Try up to 10 times to generate matching color
        for (let i = 0; i < 10 && !pattern.test(color); i++) {
          color = fakerInstance.color.rgb({ format: 'hex' }).toLowerCase();
        }
      }

      return color;
    }
  }

  validate(value: unknown, options: ValueOptions): boolean {
    if (typeof value !== 'string') return false;

    const color = value as string;
    const { constraints = {} } = options;

    // HTML5 color input format: #rrggbb (lowercase hex)
    const colorRegex = /^#[0-9a-f]{6}$/i;
    if (!colorRegex.test(color)) return false;

    // Check pattern constraint if specified
    if (constraints.pattern) {
      const pattern = new RegExp(constraints.pattern);
      if (!pattern.test(color)) return false;
    }

    return true;
  }
}
