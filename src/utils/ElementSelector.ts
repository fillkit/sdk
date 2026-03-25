/**
 * Intelligent CSS selector generation for form elements.
 *
 * @remarks
 * Generates unique, efficient CSS selectors for re-querying form elements from the DOM.
 * Uses a priority-based approach to create the most specific and reliable selector possible.
 *
 * **Selector Priority:**
 * 1. **ID selector** (`#element-id`) - Most specific and reliable
 * 2. **Form context + name** (`#form-id input[name="email"]`) - Scoped to form
 * 3. **Name selector** (`input[name="email"]`) - Less specific but useful
 * 4. **Position-based** (`form > input:nth-of-type(2)`) - Fallback when no ID/name
 *
 * **Key Features:**
 * - Automatic selector generation from HTMLElement
 * - Multiple fallback strategies for robust re-querying
 * - Validation to ensure selectors point to correct elements
 * - Special handling for DOM quirks (e.g., `element.id` returning child elements)
 *
 * @example
 * Basic usage:
 * ```ts
 * import { ElementSelector } from './ElementSelector';
 *
 * const input = document.querySelector('input[name="email"]');
 * const selector = ElementSelector.generate(input);
 * // Returns: '#login-form input[name="email"]'
 *
 * // Later, re-query the element
 * const element = ElementSelector.query({ selector, tagName: 'input' });
 * if (element) {
 *   element.value = 'test@example.com';
 * }
 * ```
 */

import type { FieldElementDescriptor } from '../types/index.js';
import { logger } from '@/core/Logger.js';

/**
 * Utility class for generating and using CSS selectors for form elements.
 *
 * @remarks
 * All methods are static - no instantiation required. Provides a complete
 * toolkit for selector generation, querying, validation, and fallback strategies.
 */
export class ElementSelector {
  /**
   * Generate a unique, efficient CSS selector for a form element.
   *
   * Priority order:
   * 1. ID selector (most specific)
   * 2. Form context + name selector
   * 3. Name selector alone
   * 4. Position-based nth-of-type selector (fallback)
   *
   * @param element - The HTMLElement to generate a selector for
   * @returns CSS selector string
   *
   * @example
   * ```typescript
   * const input = document.querySelector('input[name="email"]');
   * const selector = ElementSelector.generate(input);
   * // Returns: '#login-form input[name="email"]' or '#email-field' etc.
   * ```
   */
  static generate(element: HTMLElement): string {
    // Priority 1: ID selector (most specific and reliable)
    // Use getAttribute() to avoid DOM quirk where element.id returns <input name="id">
    const elementId = element.getAttribute('id');
    if (elementId) {
      return `#${this.escape(elementId)}`;
    }

    const name = element.getAttribute('name');
    const form = element.closest('form');

    // Priority 2: Form context + name selector
    if (name && form) {
      // Use getAttribute() to avoid DOM quirk where form.id/name return child elements
      const formId = form.getAttribute('id') || form.getAttribute('name');
      if (formId) {
        // e.g., "#login-form input[name="email"]"
        return `#${this.escape(formId)} ${element.tagName.toLowerCase()}[name="${this.escape(name)}"]`;
      }
      // Form has no ID/name, use generic form selector
      // e.g., "form input[name="email"]"
      return `form ${element.tagName.toLowerCase()}[name="${this.escape(name)}"]`;
    }

    // Priority 3: Name selector alone (less specific but still useful)
    if (name) {
      return `${element.tagName.toLowerCase()}[name="${this.escape(name)}"]`;
    }

    // Priority 4: Position-based selector (fallback)
    // This is the least reliable as DOM structure can change
    return this.generatePositionalSelector(element);
  }

  /**
   * Generates a position-based selector using nth-of-type.
   *
   * @remarks
   * Used as a fallback when no ID or name is available. This is the least
   * reliable selector type as DOM structure can change, but it's better than nothing.
   *
   * @param element - The HTMLElement to generate a selector for
   *
   * @returns Positional CSS selector (e.g., `div > input:nth-of-type(2)`)
   *
   * @internal
   */
  private static generatePositionalSelector(element: HTMLElement): string {
    const tag = element.tagName.toLowerCase();
    const parent = element.parentElement;

    if (!parent) {
      return tag;
    }

    // Find position among siblings of same type
    const siblings = Array.from(parent.children).filter(
      el => el.tagName.toLowerCase() === tag
    );
    const index = siblings.indexOf(element);

    if (index === -1) {
      return tag;
    }

    // Build selector with parent context
    const parentSelector = this.generateParentSelector(parent);
    return `${parentSelector} > ${tag}:nth-of-type(${index + 1})`;
  }

  /**
   * Generates a selector for a parent element.
   *
   * @remarks
   * Used in positional selectors to provide context. Prefers ID, then tag+class.
   *
   * @param parent - Parent HTMLElement
   *
   * @returns CSS selector for parent (e.g., `#container`, `div.form-group`)
   *
   * @internal
   */
  private static generateParentSelector(parent: HTMLElement): string {
    // Use parent's ID if available
    // Use getAttribute() to avoid DOM quirk where parent.id returns <input name="id">
    const parentId = parent.getAttribute('id');
    if (parentId) {
      return `#${this.escape(parentId)}`;
    }

    // Use parent's tag + class if available
    const tag = parent.tagName.toLowerCase();
    if (parent.className && typeof parent.className === 'string') {
      const classes = parent.className
        .trim()
        .split(/\s+/)
        .filter(c => c.length > 0)
        .map(c => `.${this.escape(c)}`)
        .join('');
      if (classes) {
        return tag + classes;
      }
    }

    return tag;
  }

  /**
   * Escapes special characters in CSS selectors.
   *
   * @remarks
   * Uses native `CSS.escape` if available, otherwise implements a fallback.
   * Handles characters like `#`, `.`, `[`, `]`, `:`, etc. that have special
   * meaning in CSS selectors.
   *
   * @param str - String to escape
   *
   * @returns Escaped string safe for use in CSS selectors
   *
   * @example
   * ```ts
   * ElementSelector.escape('my.id'); // Returns: 'my\\.id'
   * ElementSelector.escape('user[0]'); // Returns: 'user\\[0\\]'
   * ```
   *
   * @internal
   */
  private static escape(str: string): string {
    if (typeof CSS !== 'undefined' && CSS.escape) {
      return CSS.escape(str);
    }

    // Fallback implementation for environments without CSS.escape
    return str.replace(/([!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~])/g, '\\$1');
  }

  /**
   * Re-query an element from the DOM using a descriptor.
   * Returns null if the element cannot be found.
   *
   * @param descriptor - FieldElementDescriptor containing the selector
   * @param scope - Optional scope to search within (default: document)
   * @returns The HTMLElement if found, null otherwise
   *
   * @example
   * ```typescript
   * const element = ElementSelector.query(descriptor);
   * if (element) {
   *   element.value = 'new value';
   * }
   * ```
   */
  static query(
    descriptor: FieldElementDescriptor,
    scope: Document | HTMLElement = document
  ): HTMLElement | null {
    try {
      const element = scope.querySelector(descriptor.selector);
      return element as HTMLElement | null;
    } catch (error) {
      logger.warn(
        `Failed to query element with selector: ${descriptor.selector}`,
        error
      );
      return null;
    }
  }

  /**
   * Validates that a selector is still valid and points to the expected element type.
   *
   * @remarks
   * Useful for detecting if DOM structure has changed since the selector was generated.
   * Checks both element existence and type/name matching.
   *
   * @param descriptor - FieldElementDescriptor to validate
   * @param scope - Optional scope to search within (default: document)
   *
   * @returns True if selector is valid and points to correct element type
   *
   * @example
   * ```ts
   * const isValid = ElementSelector.validate(descriptor);
   * if (!isValid) {
   *   console.warn('DOM structure changed, selector no longer valid');
   * }
   * ```
   */
  static validate(
    descriptor: FieldElementDescriptor,
    scope: Document | HTMLElement = document
  ): boolean {
    const element = this.query(descriptor, scope);
    if (!element) {
      return false;
    }

    // Verify element type matches
    const tagMatches =
      element.tagName.toLowerCase() === descriptor.tagName.toLowerCase();
    if (!tagMatches) {
      return false;
    }

    // Verify name matches if specified
    if (descriptor.name) {
      const nameMatches = element.getAttribute('name') === descriptor.name;
      if (!nameMatches) {
        return false;
      }
    }

    return true;
  }

  /**
   * Attempts to re-query an element with multiple fallback strategies.
   *
   * @remarks
   * Tries multiple approaches in order:
   * 1. Primary selector from descriptor
   * 2. Name attribute selector
   * 3. ID selector (if available)
   * 4. Form context + name (if available)
   *
   * This is more robust than `query()` for handling DOM changes.
   *
   * @param descriptor - FieldElementDescriptor with selector and metadata
   * @param scope - Optional scope to search within (default: document)
   *
   * @returns HTMLElement if found by any strategy, null otherwise
   *
   * @example
   * ```ts
   * // Try to find element even if primary selector fails
   * const element = ElementSelector.queryWithFallback(descriptor);
   * if (element) {
   *   console.log('Found element using fallback strategy');
   * } else {
   *   console.error('Element not found with any strategy');
   * }
   * ```
   */
  static queryWithFallback(
    descriptor: FieldElementDescriptor,
    scope: Document | HTMLElement = document
  ): HTMLElement | null {
    // Strategy 1: Use primary selector
    let element = this.query(descriptor, scope);
    if (element) return element;

    // Strategy 2: Try name attribute
    if (descriptor.name) {
      const nameSelector = `${descriptor.tagName}[name="${this.escape(descriptor.name)}"]`;
      element = scope.querySelector(nameSelector) as HTMLElement | null;
      if (element) return element;
    }

    // Strategy 3: Try ID if available
    if (descriptor.id) {
      element = scope.querySelector(
        `#${this.escape(descriptor.id)}`
      ) as HTMLElement | null;
      if (element) return element;
    }

    // Strategy 4: Try form context if available
    if (descriptor.formId && descriptor.name) {
      const formContextSelector = `#${this.escape(descriptor.formId)} ${descriptor.tagName}[name="${this.escape(descriptor.name)}"]`;
      element = scope.querySelector(formContextSelector) as HTMLElement | null;
      if (element) return element;
    }

    return null;
  }
}
