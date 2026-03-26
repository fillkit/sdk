/**
 * URL Strategy
 *
 * Generates URLs, website addresses, display names, and user agents
 * using Faker.js internet API.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class UrlStrategy implements Strategy {
  generate(options: ValueOptions): string {
    const {
      mode = 'valid',
      constraints = {},
      fieldType,
      faker: fakerInstance = faker,
    } = options;

    if (mode === 'invalid') {
      const invalidType = fakerInstance.helpers.arrayElement([
        'no-protocol',
        'invalid-protocol',
        'no-domain',
        'invalid-chars',
      ]);

      switch (invalidType) {
        case 'no-protocol':
          return fakerInstance.internet.domainName() + '.com';
        case 'invalid-protocol':
          return 'htp://' + fakerInstance.internet.domainName();
        case 'no-domain':
          return 'https://';
        case 'invalid-chars':
          return (
            'https://' +
            fakerInstance.lorem.word() +
            ' <script>alert("xss")</script>'
          );
        default:
          return 'invalid-url';
      }
    } else {
      // Non-URL field types
      switch (fieldType) {
        case 'displayName': {
          const identity = options.formIdentity;
          return identity
            ? fakerInstance.internet.displayName({
                firstName: identity.firstName,
                lastName: identity.lastName,
              })
            : fakerInstance.internet.displayName();
        }

        case 'userAgent':
          return fakerInstance.internet.userAgent();
      }

      // URL generators
      const urlTypes = [
        () => fakerInstance.internet.url(),
        () => `https://www.${fakerInstance.internet.domainName()}`,
        () =>
          `https://${fakerInstance.internet.domainName()}/${fakerInstance.lorem.slug()}`,
        () =>
          `https://${fakerInstance.internet.domainName()}/products/${fakerInstance.string.uuid()}`,
        () => `https://api.${fakerInstance.internet.domainName()}/v1/endpoint`,
      ];

      let url: string;

      switch (fieldType) {
        case 'website':
          url = `https://www.${fakerInstance.internet.domainName()}`;
          break;

        case 'domain':
          url = fakerInstance.internet.domainName();
          break;

        case 'url':
        default: {
          const generator = fakerInstance.helpers.arrayElement(urlTypes);
          url = generator();
        }
      }

      if (constraints.pattern) {
        const pattern = new RegExp(constraints.pattern);
        for (let i = 0; i < 10 && !pattern.test(url); i++) {
          const generator = fakerInstance.helpers.arrayElement(urlTypes);
          url = generator();
        }
      }

      const minLength = constraints.minlength || 0;
      const maxLength = constraints.maxlength || Infinity;

      if (url.length < minLength) {
        const padding = '/' + 'x'.repeat(minLength - url.length - 1);
        url = url + padding;
      }

      if (url.length > maxLength && maxLength !== Infinity) {
        const domain = fakerInstance.internet.domainName();
        url = `https://${domain}`;
        if (url.length > maxLength) {
          url = url.substring(0, maxLength);
        }
      }

      return url;
    }
  }

  validate(value: unknown, options: ValueOptions): boolean {
    if (typeof value !== 'string') return false;

    const url = value as string;
    const { constraints = {} } = options;

    try {
      new URL(url);
    } catch {
      return false;
    }

    if (constraints.minlength && url.length < constraints.minlength)
      return false;
    if (constraints.maxlength && url.length > constraints.maxlength)
      return false;

    return true;
  }
}
