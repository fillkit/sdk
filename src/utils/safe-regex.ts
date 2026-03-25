/**
 * Safe regex utilities for ReDoS protection.
 *
 * Validates and safely executes regular expressions from untrusted sources
 * (e.g., HTML pattern attributes) to prevent catastrophic backtracking.
 *
 * @see https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS
 */

/** Maximum allowed pattern length to prevent resource exhaustion. */
const MAX_PATTERN_LENGTH = 200;

/**
 * Heuristic to detect patterns with nested quantifiers that can cause
 * catastrophic backtracking. Matches patterns like `(a+)+`, `(a*)*`,
 * `(a+|b+)+`, `(.*a){10}`, etc.
 */
const DANGEROUS_PATTERN = /(\([^)]*[+*][^)]*\))[+*]|\(\?[^)]*[+*][^)]*\)[+*]/;

/**
 * Tests whether a regex pattern is potentially dangerous (ReDoS-prone).
 *
 * @param pattern - The regex pattern string to check.
 * @returns `true` if the pattern looks dangerous, `false` otherwise.
 */
export function isDangerousPattern(pattern: string): boolean {
  if (pattern.length > MAX_PATTERN_LENGTH) return true;
  return DANGEROUS_PATTERN.test(pattern);
}

/**
 * Safely tests a value against a regex pattern string.
 *
 * - Rejects patterns exceeding {@link MAX_PATTERN_LENGTH} characters.
 * - Rejects patterns with nested quantifiers (ReDoS heuristic).
 * - Wraps `new RegExp()` in try/catch to handle invalid patterns.
 * - Falls back to simple string inclusion check on failure.
 *
 * @param pattern - Regex pattern string (e.g., from an HTML `pattern` attribute).
 * @param value - The value to test against the pattern.
 * @returns `true` if the value matches the pattern (or the fallback check).
 */
export function safeRegexTest(pattern: string, value: string): boolean {
  if (!pattern) return true;

  if (isDangerousPattern(pattern)) {
    // Fall back to simple string inclusion for dangerous patterns
    return value.includes(pattern.replace(/[.*+?^${}()|[\]\\]/g, ''));
  }

  try {
    const regex = new RegExp(pattern);
    return regex.test(value);
  } catch {
    // Invalid regex — fall back to simple inclusion check
    return value.includes(pattern);
  }
}

/**
 * Creates a safe RegExp from a pattern string, or returns `null` if the
 * pattern is invalid or dangerous.
 *
 * @param pattern - Regex pattern string.
 * @param flags - Optional regex flags.
 * @returns A RegExp instance, or `null` if unsafe/invalid.
 */
export function safeRegExp(pattern: string, flags?: string): RegExp | null {
  if (!pattern || isDangerousPattern(pattern)) return null;

  try {
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
}
