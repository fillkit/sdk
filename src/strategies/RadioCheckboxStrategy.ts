/**
 * Radio/Checkbox Strategy
 *
 * Generates boolean values for radio buttons and checkboxes.
 * Respects required attribute for validation.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class RadioCheckboxStrategy implements Strategy {
  generate(options: ValueOptions): boolean {
    const { mode = 'valid', element, faker: fakerInstance = faker } = options;

    // Check if element has required attribute
    const isRequired = element?.hasAttribute('required') || false;

    if (mode === 'invalid') {
      // For invalid mode with required fields, return false (unchecked)
      if (isRequired) {
        return false;
      }
      // For non-required, generate random boolean
      return fakerInstance.datatype.boolean();
    } else {
      // Valid mode
      if (isRequired) {
        // Required fields should be checked
        return true;
      }
      // For non-required, generate reasonable boolean (with bias toward true)
      return fakerInstance.datatype.boolean({ probability: 0.7 });
    }
  }

  validate(value: unknown): boolean {
    return typeof value === 'boolean';
  }
}
