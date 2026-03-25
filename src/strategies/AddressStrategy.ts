/**
 * Address Strategy
 *
 * Generates address components using Faker.js location API.
 * Uses faker.location.secondaryAddress() for locale-aware line2 generation.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class AddressStrategy implements Strategy {
  generate(options: ValueOptions): string {
    const {
      mode = 'valid',
      fieldType,
      constraints = {},
      faker: fakerInstance = faker,
    } = options;

    if (mode === 'invalid') {
      const invalidType = fakerInstance.helpers.arrayElement([
        'too-short',
        'too-long',
        'invalid-chars',
      ]);

      switch (invalidType) {
        case 'too-short':
          return fakerInstance.string.alpha(
            Math.max(0, (constraints.minlength || 1) - 1)
          );
        case 'too-long': {
          const longAddress = fakerInstance.lorem
            .paragraphs(2)
            .replace(/\s/g, '');
          return constraints.maxlength
            ? longAddress.substring(0, constraints.maxlength + 10)
            : longAddress;
        }
        case 'invalid-chars':
          return (
            fakerInstance.lorem.sentence() + ' <script>alert("xss")</script>'
          );
        default:
          return 'invalid-address';
      }
    } else {
      let address: string;

      switch (fieldType) {
        case 'address.line1':
        case 'address':
          address = fakerInstance.location.streetAddress();
          break;

        case 'address.line2':
          address = fakerInstance.location.secondaryAddress();
          break;

        case 'city':
          address = fakerInstance.location.city();
          break;

        case 'state':
        case 'province':
          address = fakerInstance.location.state();
          break;

        case 'postalCode':
        case 'zipCode':
          address = fakerInstance.location.zipCode();
          break;

        case 'country':
          address = fakerInstance.location.country();
          break;

        case 'region':
          address = fakerInstance.location.county();
          break;

        case 'latitude':
          address = fakerInstance.location.latitude().toString();
          break;

        case 'longitude':
          address = fakerInstance.location.longitude().toString();
          break;

        case 'buildingNumber':
          address = fakerInstance.location.buildingNumber();
          break;

        case 'street':
          address = fakerInstance.location.street();
          break;

        case 'continent':
          address = fakerInstance.location.continent();
          break;

        default:
          address = fakerInstance.location.streetAddress();
          break;
      }

      address = this.adjustTextLength(address, constraints, fakerInstance);

      return address;
    }
  }

  private adjustTextLength(
    text: string,
    constraints: ValueOptions['constraints'],
    fakerInstance: typeof faker
  ): string {
    const minLength = constraints?.minlength || 0;
    const maxLength = constraints?.maxlength || Infinity;

    if (text.length < minLength) {
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

    const address = value as string;
    const { constraints = {} } = options;

    if (constraints.minlength && address.length < constraints.minlength)
      return false;
    if (constraints.maxlength && address.length > constraints.maxlength)
      return false;

    return address.length > 0;
  }
}
