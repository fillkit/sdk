/**
 * Generates passwords with configurable complexity requirements.
 * Supports valid (strong) and invalid (weak) modes for validation testing.
 */

import type { Strategy, ValueOptions } from '../types/index.js';
import { faker } from '@faker-js/faker';

/**
 * Password strategy implementation for generating and validating passwords.
 *
 * @example
 * ```ts
 * const strategy = new PasswordStrategy();
 * const strongPassword = strategy.generate({ mode: 'valid' });
 * // Returns: "X9k$mP2aQ" (strong password with mixed characters)
 *
 * const weakPassword = strategy.generate({ mode: 'invalid' });
 * // Returns: "123" (too short)
 *
 * strategy.validate("X9k$mP2aQ", {}); // true (has 3+ character types)
 * strategy.validate("password", {}); // false (only lowercase)
 * ```
 */
export class PasswordStrategy implements Strategy {
  /**
   * Generate a password based on the specified mode and constraints.
   *
   * @param options - Generation options including mode and constraints
   * @param options.mode - 'valid' for strong passwords, 'invalid' for weak passwords
   * @param options.constraints - Optional password requirements
   * @param options.constraints.minlength - Minimum password length (default: 8)
   * @param options.constraints.maxlength - Maximum password length (default: 128)
   * @param options.constraints.pattern - Regex pattern for password requirements
   * @returns Generated password string
   *
   * @example
   * ```ts
   * // Strong password with custom length
   * generate({ mode: 'valid', constraints: { minlength: 12 } });
   * // Returns: "aB3$xY9zQ#mN" (12+ chars, mixed types)
   *
   * // Weak password for testing validation
   * generate({ mode: 'invalid' });
   * // Returns: "abc" (too short, no complexity)
   * ```
   */
  generate(options: ValueOptions): string {
    const {
      mode = 'valid',
      constraints = {},
      faker: fakerInstance = faker,
    } = options;
    const minLength = constraints.minlength || 8;
    const maxLength = constraints.maxlength || 128;
    const pattern = constraints.pattern;

    if (mode === 'invalid') {
      // Generate invalid passwords
      const invalidTypes = [
        'too-short',
        'no-uppercase',
        'only-lowercase',
        'only-numbers',
        'too-simple',
      ];
      const invalidType = fakerInstance.helpers.arrayElement(invalidTypes);

      switch (invalidType) {
        case 'too-short':
          return fakerInstance.internet.password({
            length: Math.max(1, minLength - 1),
          });
        case 'no-uppercase':
          return (
            fakerInstance.string.alpha({ length: minLength, casing: 'lower' }) +
            '123'
          );
        case 'only-lowercase':
          return fakerInstance.string.alpha({
            length: minLength,
            casing: 'lower',
          });
        case 'only-numbers':
          return fakerInstance.string.numeric(minLength);
        case 'too-simple':
          return 'password123'; // Common weak password
        default:
          return '123'; // Weak password
      }
    } else {
      // Determine password requirements from pattern
      const requiresUppercase =
        pattern?.includes('[A-Z]') || pattern?.includes('(?=.*[A-Z])');
      const requiresLowercase =
        pattern?.includes('[a-z]') || pattern?.includes('(?=.*[a-z])');
      const requiresNumber =
        pattern?.includes('[0-9]') || pattern?.includes('(?=.*\\d)');
      const requiresSpecial =
        pattern?.includes('[!@#$%^&*]') ||
        pattern?.includes('(?=.*[!@#$%^&*])');

      let password = '';
      const length = Math.min(Math.max(minLength, 12), maxLength); // At least 12 chars for security

      // Build character sets
      const lowercase = 'abcdefghijklmnopqrstuvwxyz';
      const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const numbers = '0123456789';
      const special = '!@#$%^&*';

      // Ensure required characters are included
      if (requiresUppercase || !pattern) {
        password += uppercase.charAt(
          fakerInstance.number.int({ min: 0, max: uppercase.length - 1 })
        );
      }
      if (requiresLowercase || !pattern) {
        password += lowercase.charAt(
          fakerInstance.number.int({ min: 0, max: lowercase.length - 1 })
        );
      }
      if (requiresNumber || !pattern) {
        password += numbers.charAt(
          fakerInstance.number.int({ min: 0, max: numbers.length - 1 })
        );
      }
      if (requiresSpecial || !pattern) {
        password += special.charAt(
          fakerInstance.number.int({ min: 0, max: special.length - 1 })
        );
      }

      // Fill remaining length with random characters
      const allChars = lowercase + uppercase + numbers + special;
      while (password.length < length) {
        password += allChars.charAt(
          fakerInstance.number.int({ min: 0, max: allChars.length - 1 })
        );
      }

      // Shuffle password
      password = password
        .split('')
        .sort(() => fakerInstance.number.float() - 0.5)
        .join('');

      // Apply max length
      if (password.length > maxLength) {
        password = password.substring(0, maxLength);
      }

      // Verify pattern if specified
      if (pattern) {
        try {
          const regex = new RegExp(pattern);
          if (!regex.test(password)) {
            // Fallback to faker's password if our custom one doesn't match
            password = fakerInstance.internet.password({
              length,
              memorable: false,
            });
            if (password.length > maxLength) {
              password = password.substring(0, maxLength);
            }
          }
        } catch {
          // Invalid regex, use generated password
        }
      }

      return password;
    }
  }

  /**
   * Validate a password against strength requirements.
   * Requires at least 3 different character types (uppercase, lowercase, numbers, symbols).
   *
   * @param value - The password to validate
   * @param options - Validation options including constraints
   * @param options.constraints - Password requirements (minlength, maxlength)
   * @returns True if password meets strength requirements
   *
   * @example
   * ```ts
   * validate("P@ssw0rd", { constraints: { minlength: 8 } }); // true (4 types)
   * validate("password", { constraints: {} }); // false (only 1 type)
   * validate("Pass123", { constraints: {} }); // true (3 types)
   * validate("Ab1", { constraints: { minlength: 8 } }); // false (too short)
   * ```
   */
  validate(value: unknown, options: ValueOptions): boolean {
    if (typeof value !== 'string') return false;

    const password = value as string;
    const { constraints = {} } = options;

    if (constraints.minlength && password.length < constraints.minlength)
      return false;
    if (constraints.maxlength && password.length > constraints.maxlength)
      return false;

    // Check password complexity
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSymbols = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    // Require at least 3 character types for strong passwords
    const characterTypes = [
      hasUppercase,
      hasLowercase,
      hasNumbers,
      hasSymbols,
    ].filter(Boolean).length;

    return characterTypes >= 3;
  }
}
