/**
 * Pattern Helpers
 *
 * Utility for generating values from regex patterns using faker.helpers.fromRegExp().
 * Falls back to retry loop for complex patterns.
 * Uses safe regex utilities to prevent ReDoS from untrusted pattern attributes.
 */

import type { faker as FakerType } from '@faker-js/faker';
import { safeRegExp, safeRegexTest } from '../../utils/safe-regex.js';

/**
 * Try to generate a value matching a regex pattern.
 * Uses faker.helpers.fromRegExp() first; falls back to a generator function on failure.
 *
 * @param pattern - Regex pattern string to match
 * @param fakerInstance - Faker instance
 * @param fallbackGenerator - Function to generate values for retry loop
 * @param maxRetries - Max retries for fallback (default 10)
 * @returns Generated value matching the pattern, or best-effort value
 */
export function generateFromPattern(
  pattern: string,
  fakerInstance: typeof FakerType,
  fallbackGenerator: () => string,
  maxRetries = 10
): string {
  const regex = safeRegExp(pattern);

  // If pattern is dangerous or invalid, skip regex matching entirely
  if (!regex) {
    return fallbackGenerator();
  }

  // Try fromRegExp first for simple patterns
  try {
    const result = fakerInstance.helpers.fromRegExp(pattern);
    if (safeRegexTest(pattern, result)) {
      return result;
    }
  } catch {
    // fromRegExp doesn't support all patterns — fall through
  }

  // Retry loop with fallback generator
  for (let i = 0; i < maxRetries; i++) {
    const value = fallbackGenerator();
    if (regex.test(value)) {
      return value;
    }
  }

  // Return last attempt even if it doesn't match
  return fallbackGenerator();
}
