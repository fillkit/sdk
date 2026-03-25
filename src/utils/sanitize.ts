/**
 * Sanitization utilities for prototype pollution prevention.
 *
 * Provides safe JSON parsing and object sanitization to prevent
 * `__proto__`, `constructor`, and `prototype` key injection attacks.
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Prototype_Pollution_Prevention_Cheat_Sheet.html
 */

/** Keys that must never appear in parsed/merged objects. */
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Strips dangerous prototype-pollution keys from a plain object (1 level deep).
 *
 * @param obj - The object to sanitize.
 * @returns A new object without dangerous keys.
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }

  const clean = Object.create(null) as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (!DANGEROUS_KEYS.has(key)) {
      clean[key] = obj[key];
    }
  }
  return clean as T;
}

/**
 * Safely parses a JSON string and strips prototype-pollution keys.
 *
 * @param raw - The raw JSON string to parse.
 * @param fallback - Value to return if parsing fails.
 * @returns The parsed and sanitized value, or the fallback.
 */
export function safeJsonParse<T>(raw: string, fallback: T): T {
  try {
    const parsed = JSON.parse(raw) as T;
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed)
    ) {
      return sanitizeObject(parsed as Record<string, unknown>) as T;
    }
    return parsed;
  } catch {
    return fallback;
  }
}
