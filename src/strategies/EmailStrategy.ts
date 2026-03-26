/**
 * Generates email addresses for form autofill.
 * Uses faker.internet.exampleEmail() for RFC 2606 safe domains when no custom domain.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class EmailStrategy implements Strategy {
  generate(options: ValueOptions): string {
    const {
      mode = 'valid',
      constraints = {},
      element,
      faker: fakerInstance = faker,
      emailDomain,
    } = options;

    const isMultiple = element?.hasAttribute('multiple') || false;

    if (mode === 'invalid') {
      if (isMultiple) {
        const count = fakerInstance.number.int({ min: 2, max: 3 });
        const emails: string[] = [];

        for (let i = 0; i < count; i++) {
          if (i === 0) {
            const invalidType = fakerInstance.helpers.arrayElement([
              'no-at',
              'no-domain',
              'invalid-chars',
            ]);

            switch (invalidType) {
              case 'no-at':
                emails.push(fakerInstance.internet.username() + 'example.com');
                break;
              case 'no-domain':
                emails.push(fakerInstance.internet.username() + '@');
                break;
              case 'invalid-chars':
                emails.push(
                  fakerInstance.internet.username() +
                    '@' +
                    fakerInstance.lorem.word() +
                    '.'
                );
                break;
            }
          } else {
            emails.push(fakerInstance.internet.email());
          }
        }

        return emails.join(', ');
      }

      const invalidType = fakerInstance.helpers.arrayElement([
        'no-at',
        'no-domain',
        'invalid-chars',
        'too-long',
      ]);

      switch (invalidType) {
        case 'no-at':
          return fakerInstance.internet.username() + 'example.com';
        case 'no-domain':
          return fakerInstance.internet.username() + '@';
        case 'invalid-chars':
          return (
            fakerInstance.internet.username() +
            '@' +
            fakerInstance.lorem.word() +
            '.'
          );
        case 'too-long':
          return (
            fakerInstance.lorem.paragraph().replace(/\s/g, '') +
            '@' +
            fakerInstance.lorem.word() +
            '.com'
          );
        default:
          return 'invalid-email';
      }
    } else {
      const identity = options.formIdentity;

      if (isMultiple) {
        const count = fakerInstance.number.int({ min: 2, max: 4 });
        const emails: string[] = [];

        for (let i = 0; i < count; i++) {
          if (emailDomain) {
            const username = identity
              ? fakerInstance.internet.username({
                  firstName: identity.firstName,
                  lastName: identity.lastName,
                })
              : fakerInstance.internet.username();
            emails.push(`${username}@${emailDomain}`);
          } else {
            emails.push(
              identity
                ? fakerInstance.internet.exampleEmail({
                    firstName: identity.firstName,
                    lastName: identity.lastName,
                  })
                : fakerInstance.internet.exampleEmail()
            );
          }
        }

        return emails.join(', ');
      }

      // Single valid email — use exampleEmail() for RFC 2606 safe domains
      let email = emailDomain
        ? `${identity ? fakerInstance.internet.username({ firstName: identity.firstName, lastName: identity.lastName }) : fakerInstance.internet.username()}@${emailDomain}`
        : identity
          ? fakerInstance.internet.exampleEmail({
              firstName: identity.firstName,
              lastName: identity.lastName,
            })
          : fakerInstance.internet.exampleEmail();

      if (constraints.pattern) {
        const pattern = new RegExp(constraints.pattern);
        for (let i = 0; i < 10; i++) {
          if (pattern.test(email)) break;
          email = emailDomain
            ? `${identity ? fakerInstance.internet.username({ firstName: identity.firstName, lastName: identity.lastName }) : fakerInstance.internet.username()}@${emailDomain}`
            : identity
              ? fakerInstance.internet.exampleEmail({
                  firstName: identity.firstName,
                  lastName: identity.lastName,
                })
              : fakerInstance.internet.exampleEmail();
        }
      }

      const minLength = constraints.minlength || 0;
      const maxLength = constraints.maxlength || Infinity;

      if (email.length < minLength) {
        const [local, domain] = email.split('@');
        const padding = 'x'.repeat(minLength - email.length);
        email = `${local}${padding}@${domain}`;
      }

      if (email.length > maxLength && maxLength !== Infinity) {
        const atIndex = email.indexOf('@');
        if (atIndex !== -1 && maxLength > atIndex + 2) {
          const domainPart = email.substring(atIndex);
          const localPart = email.substring(0, maxLength - domainPart.length);
          email = localPart + domainPart;
        } else {
          email = email.substring(0, maxLength);
        }
      }

      return email;
    }
  }

  validate(value: unknown, options: ValueOptions): boolean {
    if (typeof value !== 'string') return false;

    const email = value as string;
    const { constraints = {} } = options;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) return false;

    if (constraints.minlength && email.length < constraints.minlength)
      return false;
    if (constraints.maxlength && email.length > constraints.maxlength)
      return false;

    return true;
  }
}
