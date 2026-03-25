/**
 * Discovers forms and fields in the DOM with selector-based filtering.
 */

import type { AutofillOptions } from '../types/index.js';
import { buildAttributeSelector } from '../utils/dom-helpers.js';

/**
 * Options for form detection.
 */
export interface FormDetectionOptions {
  /** CSS selectors to include. Only forms matching these will be returned. */
  includeSelectors?: string[];
  /** CSS selectors to exclude. Forms matching these will be skipped. */
  excludeSelectors?: string[];
}

/**
 * Options for field detection.
 */
export interface FieldDetectionOptions {
  /** CSS selectors to include. Only fields matching these will be returned. */
  includeSelectors?: string[];
  /** CSS selectors to exclude. Fields matching these will be skipped. */
  excludeSelectors?: string[];
  /** Whether to search for fields outside the form element (referencing the form via `form` attribute). */
  includeOutsideForms?: boolean;
}

/**
 * Discovers forms and fields in the DOM with filtering capabilities.
 *
 * @remarks
 * Provides methods to find forms and fields within a given scope, applying
 * include/exclude filters based on CSS selectors. Handles edge cases like
 * fields outside the `<form>` tag but linked via the `form` attribute.
 *
 * @example
 * ```ts
 * const detector = new FormDetector();
 * const forms = detector.findForms(document, {
 *   excludeSelectors: ['.ignore-form']
 * });
 * const fields = detector.findFields(forms[0], {
 *   includeSelectors: ['input', 'select']
 * });
 * ```
 */
export class FormDetector {
  /**
   * Finds all forms in the specified scope matching the provided options.
   *
   * @remarks
   * Filters forms based on `includeSelectors` and `excludeSelectors`.
   * Also respects the `data-fillkit-ignore` attribute.
   *
   * @param scope - The element or document to search within.
   * @param options - Detection options for filtering forms.
   * @returns An array of form elements that match the criteria.
   */
  findForms(
    scope: HTMLElement | Document,
    options: FormDetectionOptions = {}
  ): HTMLFormElement[] {
    const forms: HTMLFormElement[] = [];

    // Find all form elements
    const formElements = scope.querySelectorAll('form');

    for (const form of formElements) {
      // Check include/exclude selectors
      if (
        options.includeSelectors &&
        options.includeSelectors.length > 0 &&
        !this.matchesSelectors(form, options.includeSelectors)
      ) {
        continue;
      }

      if (
        options.excludeSelectors &&
        options.excludeSelectors.length > 0 &&
        this.matchesSelectors(form, options.excludeSelectors)
      ) {
        continue;
      }

      // Skip if explicitly ignored
      if (form.hasAttribute('data-fillkit-ignore')) {
        continue;
      }

      forms.push(form);
    }

    return forms;
  }

  /**
   * Finds all fillable fields within a form or element.
   *
   * @remarks
   * Searches for `input`, `select`, `textarea`, and optionally `contenteditable` elements.
   * Filters out hidden, disabled, or readonly fields, as well as those matching exclude selectors.
   * Can optionally find fields outside the form element if they reference it via the `form` attribute.
   *
   * @param container - The form or element to search within.
   * @param options - Detection options for filtering fields.
   * @returns An array of field elements that can be filled.
   */
  findFields(
    container: HTMLFormElement | HTMLElement,
    options: FieldDetectionOptions = {}
  ): HTMLElement[] {
    const fields: HTMLElement[] = [];
    const selectors = ['input', 'select', 'textarea'];

    // Add contenteditable elements if enabled
    if (options.includeSelectors?.some(s => s.includes('contenteditable'))) {
      selectors.push('[contenteditable="true"]');
    }

    // Batch all selectors into a single DOM query
    const combinedSelector = selectors.join(', ');
    const elements = container.querySelectorAll(combinedSelector);

    for (const element of elements) {
      // Skip hidden, disabled, or readonly fields
      if (this.isFieldIgnored(element as HTMLElement)) {
        continue;
      }

      // Check include/exclude selectors
      if (
        options.includeSelectors &&
        options.includeSelectors.length > 0 &&
        !this.matchesSelectors(element, options.includeSelectors)
      ) {
        continue;
      }

      if (
        options.excludeSelectors &&
        options.excludeSelectors.length > 0 &&
        this.matchesSelectors(element, options.excludeSelectors)
      ) {
        continue;
      }

      // Skip if explicitly ignored
      if (element.hasAttribute('data-fillkit-ignore')) {
        continue;
      }

      fields.push(element as HTMLElement);
    }

    // Include external form elements if enabled
    // Use getAttribute() to avoid DOM quirk where container.id returns <input name="id">
    const containerId =
      container instanceof HTMLFormElement
        ? container.getAttribute('id')
        : null;
    if (
      options.includeOutsideForms &&
      container instanceof HTMLFormElement &&
      containerId
    ) {
      const externalFields = this.findExternalFormFields(containerId, options);
      fields.push(...externalFields);
    }

    return fields;
  }

  /**
   * Finds form elements outside the form tag that reference this form via the `form` attribute.
   *
   * @remarks
   * This is necessary for modern HTML forms where inputs might not be nested within the `<form>` tag.
   *
   * @param formId - The ID of the form to find external fields for.
   * @param options - Detection options for filtering fields.
   * @returns An array of external field elements.
   */
  findExternalFormFields(
    formId: string,
    options: FieldDetectionOptions = {}
  ): HTMLElement[] {
    const fields: HTMLElement[] = [];
    const selectors = ['input', 'select', 'textarea', 'button'];

    // Batch all selectors into a single DOM query
    const formAttr = buildAttributeSelector('form', formId);
    const selectorWithForm = selectors
      .map(sel => `${sel}${formAttr}`)
      .join(', ');
    const elements = document.querySelectorAll(selectorWithForm);

    for (const element of elements) {
      // Skip hidden, disabled, or readonly fields
      if (this.isFieldIgnored(element as HTMLElement)) {
        continue;
      }

      // Check include/exclude selectors
      if (
        options.includeSelectors &&
        options.includeSelectors.length > 0 &&
        !this.matchesSelectors(element, options.includeSelectors)
      ) {
        continue;
      }

      if (
        options.excludeSelectors &&
        options.excludeSelectors.length > 0 &&
        this.matchesSelectors(element, options.excludeSelectors)
      ) {
        continue;
      }

      // Skip if explicitly ignored
      if (element.hasAttribute('data-fillkit-ignore')) {
        continue;
      }

      fields.push(element as HTMLElement);
    }

    return fields;
  }

  /**
   * Checks if a field should be ignored based on its state and type.
   *
   * @remarks
   * Fields are ignored if they are:
   * - Hidden, disabled, or readonly
   * - Submit, reset, button, or image input types
   *
   * @param element - The element to check.
   * @returns `true` if the field should be ignored, `false` otherwise.
   */
  isFieldIgnored(element: HTMLElement): boolean {
    if (element instanceof HTMLInputElement) {
      const type = element.type.toLowerCase();
      return (
        element.hidden ||
        element.disabled ||
        element.readOnly ||
        ['hidden', 'submit', 'reset', 'button', 'image'].includes(type)
      );
    }

    if (element instanceof HTMLSelectElement) {
      return element.disabled;
    }

    if (element instanceof HTMLTextAreaElement) {
      return element.disabled || element.readOnly;
    }

    return false;
  }

  /**
   * Checks if an element matches any of the provided CSS selectors.
   *
   * @param element - The element to test.
   * @param selectors - Array of CSS selector strings.
   * @returns `true` if the element matches any selector, `false` otherwise.
   */
  private matchesSelectors(element: Element, selectors: string[]): boolean {
    return selectors.some(selector => {
      try {
        return element.matches(selector);
      } catch {
        return false;
      }
    });
  }

  /**
   * Creates field detection options from autofill options.
   *
   * @remarks
   * Helper method to convert {@link AutofillOptions} to {@link FieldDetectionOptions}.
   *
   * @param options - Autofill options.
   * @returns Field detection options.
   */
  static fromAutofillOptions(options: AutofillOptions): FieldDetectionOptions {
    return {
      includeSelectors: options.includeSelectors,
      excludeSelectors: options.excludeSelectors,
      includeOutsideForms: options.includeOutsideForms,
    };
  }
}
