/**
 * OTP/PIN Strategy
 *
 * Generates one-time passwords, PIN codes, and verification codes.
 * Uses faker.finance.pin() for PIN codes.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

export class OTPPinStrategy implements Strategy {
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
        'non-numeric',
        'with-spaces',
      ]);

      switch (invalidType) {
        case 'too-short':
          return fakerInstance.string.numeric(2);
        case 'too-long':
          return fakerInstance.string.numeric(12);
        case 'non-numeric':
          return fakerInstance.lorem.word();
        case 'with-spaces':
          return (
            fakerInstance.string.numeric(3) +
            ' ' +
            fakerInstance.string.numeric(3)
          );
        default:
          return 'invalid';
      }
    } else {
      let length: number;

      switch (fieldType) {
        case 'otpCode':
        case 'verificationCode':
          length = 6;
          break;
        case 'pinCode':
          length = 4;
          break;
        default:
          length = 6;
      }

      const minLength = constraints.minlength || length;
      const maxLength = constraints.maxlength || length;
      const finalLength = Math.min(Math.max(length, minLength), maxLength);

      let code: string;

      if (fieldType === 'pinCode') {
        code = fakerInstance.finance.pin({ length: finalLength });
      } else {
        code = fakerInstance.string.numeric(finalLength);
      }

      if (constraints.pattern) {
        const pattern = new RegExp(constraints.pattern);
        for (let i = 0; i < 10 && !pattern.test(code); i++) {
          code =
            fieldType === 'pinCode'
              ? fakerInstance.finance.pin({ length: finalLength })
              : fakerInstance.string.numeric(finalLength);
        }
      }

      return code;
    }
  }

  validate(value: unknown, options: ValueOptions): boolean {
    if (typeof value !== 'string') return false;

    const code = value as string;
    const { constraints = {} } = options;

    if (!/^\d+$/.test(code)) return false;

    const minLength = constraints.minlength || 4;
    const maxLength = constraints.maxlength || 8;

    if (code.length < minLength || code.length > maxLength) return false;

    if (constraints.pattern) {
      const pattern = new RegExp(constraints.pattern);
      if (!pattern.test(code)) return false;
    }

    return true;
  }
}
