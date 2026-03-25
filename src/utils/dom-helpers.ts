/**
 * DOM helper utilities for safe CSS selector construction and URL validation.
 *
 * @see https://owasp.org/www-project-web-security-testing-guide/v41/4-Web_Application_Security_Testing/11-Client_Side_Testing/05-Testing_for_CSS_Injection
 */

/**
 * Escapes a CSS identifier. Uses native `CSS.escape()` when available,
 * falls back to a spec-compliant polyfill for environments that lack it (e.g., jsdom).
 *
 * @see https://drafts.csswg.org/cssom/#the-css.escape()-method
 */
function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  // Polyfill: escape characters that are not safe in CSS identifiers
  return value.replace(/[\0-\x1f\x7f"\\#.,:;>+~[\](){}!@$%^&*=|/?`]/g, '\\$&');
}

/**
 * Builds a safe CSS attribute selector by escaping the value.
 *
 * @param attr - The attribute name (e.g., `'for'`, `'name'`, `'form'`).
 * @param value - The raw attribute value to escape.
 * @returns A safe CSS selector string, e.g. `[for="escaped-value"]`.
 */
export function buildAttributeSelector(attr: string, value: string): string {
  return `[${attr}="${cssEscape(value)}"]`;
}

/**
 * Validates a URL to ensure it uses a safe scheme (HTTPS or HTTP).
 *
 * @param url - The URL string to validate.
 * @returns `true` if the URL is valid and uses http/https.
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Validates a URL intended for iframe/navigation use. Rejects dangerous schemes.
 *
 * @param url - The URL string to validate.
 * @returns `true` if the URL uses a safe scheme for navigation.
 */
export function isSafeNavigationUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    const dangerousSchemes = new Set([
      'javascript:',
      'data:',
      'blob:',
      'vbscript:',
    ]);
    return !dangerousSchemes.has(parsed.protocol);
  } catch {
    return false;
  }
}
