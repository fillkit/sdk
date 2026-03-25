/**
 * SSN/Government ID Strategy
 *
 * Generates Social Security Numbers, Tax IDs, and National ID numbers.
 * Note: These are synthetic/test values only, not real government IDs.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class SSNStrategy implements Strategy {
  generate(options: ValueOptions): string {
    const {
      mode = 'valid',
      fieldType,
      constraints = {},
      faker: fakerInstance = faker,
    } = options;

    if (mode === 'invalid') {
      // Generate invalid government IDs
      const invalidTypes = [
        'wrong-format',
        'all-zeros',
        'too-short',
        'invalid-chars',
      ];
      const invalidType = fakerInstance.helpers.arrayElement(invalidTypes);

      switch (invalidType) {
        case 'wrong-format':
          return fakerInstance.string.numeric(9); // No dashes
        case 'all-zeros':
          return '000-00-0000';
        case 'too-short':
          return fakerInstance.string.numeric(5);
        case 'invalid-chars':
          return 'ABC-DE-FGHI';
        default:
          return 'invalid-id';
      }
    } else {
      // Generate valid government ID based on field type
      let id: string;

      switch (fieldType) {
        case 'ssn':
          // US SSN format: XXX-XX-XXXX
          const area = fakerInstance.number
            .int({ min: 100, max: 899 })
            .toString();
          const group = fakerInstance.number
            .int({ min: 10, max: 99 })
            .toString();
          const serial = fakerInstance.number
            .int({ min: 1000, max: 9999 })
            .toString();
          id = `${area}-${group}-${serial}`;
          break;

        case 'taxId':
          // Tax ID / EIN format: XX-XXXXXXX
          const ein1 = fakerInstance.number
            .int({ min: 10, max: 99 })
            .toString();
          const ein2 = fakerInstance.number
            .int({ min: 1000000, max: 9999999 })
            .toString();
          id = `${ein1}-${ein2}`;
          break;

        case 'nationalId':
          // Generic national ID - varies by country
          // Generate a reasonable format
          id = fakerInstance.string.numeric(10);
          break;

        default:
          id = fakerInstance.string.numeric(9);
      }

      // Respect pattern constraint if provided
      if (constraints.pattern) {
        const pattern = new RegExp(constraints.pattern);
        for (let i = 0; i < 10 && !pattern.test(id); i++) {
          // Regenerate using same logic
          if (fieldType === 'ssn') {
            const area = fakerInstance.number
              .int({ min: 100, max: 899 })
              .toString();
            const group = fakerInstance.number
              .int({ min: 10, max: 99 })
              .toString();
            const serial = fakerInstance.number
              .int({ min: 1000, max: 9999 })
              .toString();
            id = `${area}-${group}-${serial}`;
          } else {
            id = fakerInstance.string.numeric(9);
          }
        }
      }

      // Apply length constraints
      if (constraints.minlength && id.length < constraints.minlength) {
        id = id + '0'.repeat(constraints.minlength - id.length);
      }
      if (constraints.maxlength && id.length > constraints.maxlength) {
        id = id.substring(0, constraints.maxlength);
      }

      return id;
    }
  }

  validate(value: unknown, options: ValueOptions): boolean {
    if (typeof value !== 'string') return false;

    const id = value as string;
    const { constraints = {}, fieldType } = options;

    // Basic format validation based on field type
    if (fieldType === 'ssn') {
      // US SSN format: XXX-XX-XXXX
      if (!/^\d{3}-\d{2}-\d{4}$/.test(id)) return false;
    }

    // Check length constraints
    if (constraints.minlength && id.length < constraints.minlength)
      return false;
    if (constraints.maxlength && id.length > constraints.maxlength)
      return false;

    // Check pattern if provided
    if (constraints.pattern) {
      const pattern = new RegExp(constraints.pattern);
      if (!pattern.test(id)) return false;
    }

    return true;
  }
}
