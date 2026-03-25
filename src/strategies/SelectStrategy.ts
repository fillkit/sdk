/**
 * Select Strategy
 *
 * Generates values for select elements (single and multi-select).
 * Inspects actual <option> elements to select valid values.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class SelectStrategy implements Strategy {
  generate(options: ValueOptions): string {
    const { mode = 'valid', element, faker: fakerInstance = faker } = options;

    // Try to get actual options from the select element
    const selectElement = element as HTMLSelectElement | undefined;
    const availableOptions: string[] = [];

    if (selectElement && selectElement.options) {
      for (let i = 0; i < selectElement.options.length; i++) {
        const option = selectElement.options[i];
        // Skip disabled options and empty placeholder options
        if (!option.disabled && option.value) {
          availableOptions.push(option.value);
        }
      }
    }

    if (mode === 'invalid') {
      // For invalid mode, generate a value that doesn't exist in options
      // Locale-safe: use string.alpha() instead of lorem.word() for non-Latin locales (ru, zh, ja, ar, etc.)
      return fakerInstance.string.alpha(8) + '_invalid';
    } else {
      // Generate valid option value
      if (availableOptions.length > 0) {
        // Select random option from available options
        return fakerInstance.helpers.arrayElement(availableOptions);
      } else {
        // Fallback if we can't access DOM options
        // Generate locale-independent dynamic values
        const fallbackOptions = Array.from(
          { length: 6 },
          () => `option_${fakerInstance.string.alpha(6)}`
        );
        return fakerInstance.helpers.arrayElement(fallbackOptions);
      }
    }
  }

  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;

    // For select validation, we'd need to check against actual options
    // This is a basic validation - in practice, you'd check the DOM element
    return value.length > 0;
  }
}
