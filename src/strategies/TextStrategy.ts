/**
 * Text Strategy
 *
 * Generates text values for generic text fields using Faker.js data.
 * Uses faker.word.words() for natural English and faker.person.bio() for bios.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';
import { generateFromTemplate } from './utils/template-helpers.js';

export class TextStrategy implements Strategy {
  generate(options: ValueOptions): string {
    const {
      mode = 'valid',
      constraints = {},
      fieldType,
      faker: fakerInstance = faker,
    } = options;

    let text: string;

    if (mode === 'invalid') {
      const invalidType = fakerInstance.helpers.arrayElement([
        'too-short',
        'too-long',
        'invalid-chars',
      ]);

      switch (invalidType) {
        case 'too-short':
          text = fakerInstance.string.alpha(
            Math.max(0, (constraints.minlength || 1) - 1)
          );
          break;
        case 'too-long':
          text = fakerInstance.lorem.paragraphs(3);
          break;
        case 'invalid-chars':
          text =
            fakerInstance.lorem.sentence() + ' <script>alert("xss")</script>';
          break;
        default:
          text = '';
      }
    } else {
      switch (fieldType) {
        case 'company':
          text = fakerInstance.company.name();
          break;

        case 'jobTitle':
          text = fakerInstance.person.jobTitle();
          break;

        case 'department':
          text = fakerInstance.commerce.department();
          break;

        case 'username': {
          const identity = options.formIdentity;
          text = identity
            ? fakerInstance.internet.username({
                firstName: identity.firstName,
                lastName: identity.lastName,
              })
            : fakerInstance.internet.username();
          break;
        }

        case 'search':
          text = fakerInstance.commerce.productName();
          break;

        case 'bio':
        case 'about':
          text = fakerInstance.person.bio();
          break;

        case 'description':
          text = fakerInstance.commerce.productDescription();
          break;

        case 'textarea.generic': {
          const templates = [
            '{{person.fullName}} ({{person.jobTitle}} at {{company.name}})',
            '{{company.catchPhrase}}',
            '{{hacker.phrase}}',
            '{{person.bio}}',
          ];
          const template = fakerInstance.helpers.arrayElement(templates);
          text = generateFromTemplate(template, fakerInstance);
          break;
        }

        default: {
          // Use faker.word.words() for natural English instead of lorem
          const minLength = constraints.minlength || 1;

          if (minLength <= 10) {
            text = fakerInstance.word.words(
              fakerInstance.number.int({ min: 1, max: 3 })
            );
          } else if (minLength <= 50) {
            text = fakerInstance.word.words(
              fakerInstance.number.int({ min: 4, max: 8 })
            );
          } else {
            text = fakerInstance.word.words(
              fakerInstance.number.int({ min: 10, max: 20 })
            );
          }

          const maxLength = constraints.maxlength || 100;
          if (text.length < minLength) {
            text = text.padEnd(minLength, ' ');
          } else if (text.length > maxLength) {
            text = text.substring(0, maxLength);
          }
        }
      }
    }

    return text;
  }

  validate(value: unknown, options: ValueOptions): boolean {
    if (typeof value !== 'string') return false;

    const { constraints = {} } = options;
    const text = value as string;

    if (constraints.minlength && text.length < constraints.minlength)
      return false;
    if (constraints.maxlength && text.length > constraints.maxlength)
      return false;
    if (constraints.pattern && !new RegExp(constraints.pattern).test(text))
      return false;

    return true;
  }
}
