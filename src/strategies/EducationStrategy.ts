/**
 * Education Strategy
 *
 * Generates education-related data like degree, GPA, and graduation year.
 * Commonly used in job applications, student portals, and academic forms.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class EducationStrategy implements Strategy {
  private readonly degrees = [
    'Associate of Arts',
    'Associate of Science',
    'Bachelor of Arts',
    'Bachelor of Science',
    'Bachelor of Engineering',
    'Bachelor of Business Administration',
    'Master of Arts',
    'Master of Science',
    'Master of Business Administration',
    'Master of Engineering',
    'Doctor of Philosophy',
    'Juris Doctor',
    'Doctor of Medicine',
  ];

  generate(options: ValueOptions): string | number {
    const {
      mode = 'valid',
      fieldType,
      constraints = {},
      faker: fakerInstance = faker,
    } = options;

    if (mode === 'invalid') {
      // Generate invalid education data
      const invalidTypes = [
        'out-of-range',
        'negative',
        'non-numeric',
        'future-year',
      ];
      const invalidType = fakerInstance.helpers.arrayElement(invalidTypes);

      switch (invalidType) {
        case 'out-of-range':
          return fieldType === 'gpa' ? 5.5 : 1850; // Invalid GPA or very old year
        case 'negative':
          return -1;
        case 'non-numeric':
          return 'invalid';
        case 'future-year':
          return new Date().getFullYear() + 50; // Too far in future
        default:
          return 'invalid';
      }
    } else {
      // Generate valid education data based on field type
      let value: string | number;

      switch (fieldType) {
        case 'degree':
          // Academic degree
          value = fakerInstance.helpers.arrayElement(this.degrees);
          break;

        case 'gpa':
          // GPA (typically 0.0 - 4.0 scale in US)
          const minGpa = constraints.min || 0.0;
          const maxGpa = constraints.max || 4.0;
          value = parseFloat(
            fakerInstance.number
              .float({ min: minGpa, max: maxGpa, fractionDigits: 2 })
              .toFixed(2)
          );
          break;

        case 'graduationYear':
          // Graduation year (typically within last 50 years to next 10 years)
          const currentYear = new Date().getFullYear();
          const minYear = constraints.min || currentYear - 50;
          const maxYear = constraints.max || currentYear + 10;
          value = fakerInstance.number.int({ min: minYear, max: maxYear });
          break;

        default:
          value = fakerInstance.helpers.arrayElement(this.degrees);
      }

      // Respect pattern constraint if provided (for string values)
      if (typeof value === 'string' && constraints.pattern) {
        const pattern = new RegExp(constraints.pattern);
        for (let i = 0; i < 10 && !pattern.test(value); i++) {
          value = fakerInstance.helpers.arrayElement(this.degrees);
        }
      }

      return value;
    }
  }

  validate(value: unknown, options: ValueOptions): boolean {
    const { constraints = {}, fieldType } = options;

    // Validate based on field type
    if (fieldType === 'degree') {
      if (typeof value !== 'string') return false;

      // Check pattern if provided
      if (constraints.pattern) {
        const pattern = new RegExp(constraints.pattern);
        if (!pattern.test(value)) return false;
      }
    } else {
      // GPA and graduation year are numeric
      if (typeof value !== 'number') return false;
      const numValue = value as number;

      // Check range constraints
      if (constraints.min !== undefined && numValue < constraints.min)
        return false;
      if (constraints.max !== undefined && numValue > constraints.max)
        return false;

      // Additional validation for specific types
      if (fieldType === 'gpa') {
        // GPA typically 0.0-4.0 (or 0.0-5.0 for weighted)
        if (numValue < 0.0 || numValue > 5.0) return false;
      } else if (fieldType === 'graduationYear') {
        // Graduation year should be reasonable
        const currentYear = new Date().getFullYear();
        if (numValue < 1900 || numValue > currentYear + 20) return false;
      }
    }

    return true;
  }
}
