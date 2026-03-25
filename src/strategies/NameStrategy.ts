/**
 * Name Strategy
 *
 * Generates person names (first, last, full names) using comprehensive Faker.js capabilities.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class NameStrategy implements Strategy {
  generate(options: ValueOptions): string {
    const {
      mode = 'valid',
      fieldType,
      constraints = {},
      faker: fakerInstance = faker,
    } = options;

    if (mode === 'invalid') {
      // Generate invalid names
      const invalidTypes = [
        'too-short',
        'too-long',
        'invalid-chars',
        'numbers-only',
      ];
      const invalidType = fakerInstance.helpers.arrayElement(invalidTypes);

      switch (invalidType) {
        case 'too-short':
          return fakerInstance.string.alpha(
            Math.max(0, (constraints.minlength || 1) - 1)
          );
        case 'too-long':
          const longName = fakerInstance.lorem.paragraphs(1).replace(/\s/g, '');
          return constraints.maxlength
            ? longName.substring(0, constraints.maxlength + 10)
            : longName;
        case 'invalid-chars':
          return (
            fakerInstance.lorem.sentence() + ' <script>alert("xss")</script>'
          );
        case 'numbers-only':
          return fakerInstance.string.numeric(10);
        default:
          return 'invalid-name';
      }
    } else {
      // Generate valid names based on field type
      let name: string;

      switch (fieldType) {
        case 'name.given':
        case 'firstName':
          name = fakerInstance.person.firstName();
          break;

        case 'name.family':
        case 'lastName':
          name = fakerInstance.person.lastName();
          break;

        case 'middleName':
          name = fakerInstance.person.middleName();
          break;

        case 'name.prefix':
        case 'prefix':
          name = fakerInstance.person.prefix();
          break;

        case 'suffix':
          name = fakerInstance.person.suffix();
          break;

        case 'fullName':
        default:
          // Full name with realistic formatting
          name = fakerInstance.person.fullName();
          break;
      }

      // Apply length constraints
      name = this.adjustTextLength(name, constraints, fakerInstance);

      return name;
    }
  }

  /**
   * Adjust text length to respect minlength/maxlength constraints
   */
  private adjustTextLength(
    text: string,
    constraints: ValueOptions['constraints'],
    fakerInstance: typeof faker
  ): string {
    const minLength = constraints?.minlength || 0;
    const maxLength = constraints?.maxlength || Infinity;

    if (text.length < minLength) {
      // Pad with additional characters
      while (text.length < minLength) {
        text += ' ' + fakerInstance.lorem.word();
      }
      return text.substring(0, Math.max(minLength, maxLength));
    }

    if (text.length > maxLength && maxLength !== Infinity) {
      return text.substring(0, maxLength);
    }

    return text;
  }

  validate(value: unknown, options: ValueOptions): boolean {
    if (typeof value !== 'string') return false;

    const name = value as string;
    const { constraints = {} } = options;

    if (constraints.minlength && name.length < constraints.minlength)
      return false;
    if (constraints.maxlength && name.length > constraints.maxlength)
      return false;

    // Basic name validation (no numbers, reasonable length)
    const nameRegex = /^[a-zA-Z\s\-'\.]+$/;
    if (!nameRegex.test(name)) return false;

    return name.length > 0;
  }
}
