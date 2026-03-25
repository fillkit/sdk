/**
 * Collects and caches context information for pages, forms, and fields.
 *
 * @remarks
 * Gathers and caches metadata about the current page and its forms for accurate
 * field detection. Implements caching to minimize DOM traversals.
 */

import type {
  PageContext,
  FormContext,
  FieldContext,
  HeadingInfo,
  FieldNeighbor,
} from '../types/index.js';
import { FieldDetector, type FieldMappingResult } from './FieldDetector.js';

/**
 * A generic cache entry wrapper with a timestamp for TTL expiration.
 *
 * @typeParam T - The type of data stored in the cache.
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * The main class for collecting and managing context data with caching support.
 */
export class ContextCollector {
  private fieldDetector: FieldDetector;
  private pageContextCache: CacheEntry<PageContext> | null = null;
  private formContextCache: Map<string, CacheEntry<FormContext>> = new Map();
  private formIdCache = new WeakMap<HTMLFormElement, string>();
  private formIdCounter = 0;
  private readonly cacheTTL = 60000; // 1 minute TTL

  constructor() {
    this.fieldDetector = new FieldDetector();
  }

  /**
   * Retrieves the context information for the current page.
   *
   * @remarks
   * Checks the internal cache first. If expired or missing, it collects fresh data
   * including URL, metadata, headings, and all forms on the page.
   *
   * @returns The collected {@link PageContext}.
   */
  getPageContext(): PageContext {
    // Check cache
    if (this.pageContextCache && !this.isCacheExpired(this.pageContextCache)) {
      return this.pageContextCache.data;
    }

    // Collect page context
    const context: PageContext = {
      url: window.location.href,
      pathname: window.location.pathname,
      title: document.title,
      description: this.getMetaDescription(),
      keywords: this.getMetaKeywords(),
      headings: this.collectHeadings(),
      forms: this.collectAllForms(),
    };

    // Cache it
    this.pageContextCache = {
      data: context,
      timestamp: Date.now(),
    };

    return context;
  }

  /**
   * Retrieves the context information for a specific form.
   *
   * @remarks
   * Checks the cache using a generated form identifier. If not cached, it analyzes
   * the form to extract fields, title, category, and other metadata.
   *
   * @param form - The HTMLFormElement to analyze.
   * @returns The collected {@link FormContext}.
   */
  getFormContext(form: HTMLFormElement): FormContext {
    const formId = this.getFormIdentifier(form);

    // Check cache
    const cached = this.formContextCache.get(formId);
    if (cached && !this.isCacheExpired(cached)) {
      return cached.data;
    }

    // Build detection cache once — shared between collectFormFields and distribution
    const rawFields = this.getFormFields(form);
    const detectionCache = new Map<HTMLElement, FieldMappingResult>();
    for (const field of rawFields) {
      detectionCache.set(field, this.fieldDetector.detectWithConfidence(field));
    }

    // Collect form context using the shared cache
    const fields = rawFields.map((field, index) =>
      this.getFieldContextFromElement(field, rawFields, index, detectionCache)
    );
    const context: FormContext = {
      formId,
      // Use getAttribute() to avoid DOM quirk where form.action returns <input name="action">
      formAction: form.getAttribute('action') || undefined,
      formTitle: this.getFormTitle(form),
      legendTexts: this.collectLegendTexts(form),
      fields,
      fieldTypeDistribution: this.calculateFieldTypeDistribution(
        fields,
        detectionCache
      ),
    };

    // Cache it
    this.formContextCache.set(formId, {
      data: context,
      timestamp: Date.now(),
    });

    return context;
  }

  /**
   * Retrieves the context information for a specific field element.
   *
   * @remarks
   * Analyzes the field's attributes, labels, and position relative to other fields
   * in the same form.
   *
   * @param element - The HTMLElement (input, select, textarea) to analyze.
   * @returns The collected {@link FieldContext}.
   */
  getFieldContext(element: HTMLElement): FieldContext {
    const form = element.closest('form');
    const formFields = form ? this.getFormFields(form) : [element];
    const fieldIndex = formFields.indexOf(element);

    return {
      element,
      descriptor: this.fieldDetector.createDescriptor(element),
      name: element.getAttribute('name') || undefined,
      id: element.getAttribute('id') || undefined,
      type: element.getAttribute('type') || undefined,
      placeholder: element.getAttribute('placeholder') || undefined,
      labelText: this.getLabelText(element),
      nearbyFields: this.getNearbyFields(formFields, fieldIndex),
      siblingLabels: this.getSiblingLabels(element),
      positionInForm: fieldIndex >= 0 ? fieldIndex : 0,
    };
  }

  /**
   * Clears all cached page and form contexts.
   */
  clearCache(): void {
    this.pageContextCache = null;
    this.formContextCache.clear();
  }

  /**
   * Determines if a cache entry has exceeded its time-to-live (TTL).
   *
   * @param entry - The cache entry to check.
   * @returns `true` if the entry is expired, `false` otherwise.
   */
  private isCacheExpired<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > this.cacheTTL;
  }

  /**
   * Extracts the content of the meta description tag.
   *
   * @returns The description string or `undefined` if not found.
   */
  private getMetaDescription(): string | undefined {
    const meta = document.querySelector('meta[name="description"]');
    return meta?.getAttribute('content') || undefined;
  }

  /**
   * Extracts the content of the meta keywords tag.
   *
   * @returns An array of keywords or `undefined` if not found.
   */
  private getMetaKeywords(): string[] | undefined {
    const meta = document.querySelector('meta[name="keywords"]');
    const content = meta?.getAttribute('content');
    if (!content) return undefined;
    return content.split(',').map(k => k.trim());
  }

  /**
   * Collects all heading elements (h1-h6) on the page.
   *
   * @returns An array of {@link HeadingInfo} objects.
   */
  private collectHeadings(): HeadingInfo[] {
    const headings: HeadingInfo[] = [];
    const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');

    headingElements.forEach(el => {
      const level = parseInt(el.tagName.substring(1), 10);
      const text = el.textContent?.trim() || '';
      if (text) {
        headings.push({ level, text });
      }
    });

    return headings;
  }

  /**
   * Collects context for all forms present on the page.
   *
   * @returns An array of {@link FormContext} objects.
   */
  private collectAllForms(): FormContext[] {
    const forms = document.querySelectorAll('form');
    return Array.from(forms).map(form => this.getFormContext(form));
  }

  /**
   * Generates or retrieves a unique identifier for a form.
   *
   * @remarks
   * Prioritizes `id` attribute, then `name` attribute. If neither exists, generates
   * an ID based on the form's index in the document.
   *
   * @param form - The form element.
   * @returns A string identifier for the form.
   */
  private getFormIdentifier(form: HTMLFormElement): string {
    const cached = this.formIdCache.get(form);
    if (cached) return cached;

    // Use getAttribute() to avoid DOM quirk where form.id/name return child elements
    const formId = form.getAttribute('id');
    if (formId) {
      this.formIdCache.set(form, formId);
      return formId;
    }
    const formName = form.getAttribute('name');
    if (formName) {
      this.formIdCache.set(form, formName);
      return formName;
    }

    // Generate stable identifier using counter (avoids O(n) querySelectorAll)
    const generated = `form-${this.formIdCounter++}`;
    this.formIdCache.set(form, generated);
    return generated;
  }

  /**
   * Attempts to determine the title of a form.
   *
   * @remarks
   * Looks for a `<legend>` tag first, then checks preceding heading elements.
   *
   * @param form - The form element.
   * @returns The form title or `undefined` if not found.
   */
  private getFormTitle(form: HTMLFormElement): string | undefined {
    // Check for legend
    const legend = form.querySelector('legend');
    if (legend?.textContent) {
      return legend.textContent.trim();
    }

    // Check for nearby heading
    let sibling = form.previousElementSibling;
    while (sibling) {
      if (/^h[1-6]$/i.test(sibling.tagName)) {
        return sibling.textContent?.trim() || undefined;
      }
      sibling = sibling.previousElementSibling;
    }

    return undefined;
  }

  /**
   * Collects text content from all `<legend>` elements within a form.
   *
   * @param form - The form element.
   * @returns An array of legend text strings.
   */
  private collectLegendTexts(form: HTMLFormElement): string[] {
    const legends = form.querySelectorAll('legend');
    return Array.from(legends)
      .map(l => l.textContent?.trim())
      .filter((t): t is string => !!t);
  }

  /**
   * Creates a {@link FieldContext} object for a specific element.
   *
   * @param element - The field element.
   * @param allFields - Array of all fields in the form (for context).
   * @param index - The index of this field within the form.
   * @returns The populated {@link FieldContext}.
   */
  private getFieldContextFromElement(
    element: HTMLElement,
    allFields: HTMLElement[],
    index: number,
    detectionCache?: Map<HTMLElement, FieldMappingResult>
  ): FieldContext {
    return {
      element,
      descriptor: this.fieldDetector.createDescriptor(element),
      name: element.getAttribute('name') || undefined,
      id: element.getAttribute('id') || undefined,
      type: element.getAttribute('type') || undefined,
      placeholder: element.getAttribute('placeholder') || undefined,
      labelText: this.getLabelText(element),
      nearbyFields: this.getNearbyFields(allFields, index, detectionCache),
      siblingLabels: this.getSiblingLabels(element),
      positionInForm: index,
    };
  }

  /**
   * Retrieves all relevant input, select, and textarea elements from a form.
   *
   * @remarks
   * Excludes submit, reset, and button inputs.
   *
   * @param form - The form element.
   * @returns An array of form field elements.
   */
  private getFormFields(form: HTMLFormElement): HTMLElement[] {
    const selector =
      'input:not([type="submit"]):not([type="reset"]):not([type="button"]), select, textarea';
    return Array.from(form.querySelectorAll(selector));
  }

  /**
   * Identifies neighboring fields for context analysis.
   *
   * @remarks
   * Collects up to 5 preceding and 5 succeeding fields.
   *
   * @param fields - The list of all fields in the form.
   * @param currentIndex - The index of the current field.
   * @returns An array of {@link FieldNeighbor} objects.
   */
  private getNearbyFields(
    fields: HTMLElement[],
    currentIndex: number,
    detectionCache?: Map<HTMLElement, FieldMappingResult>
  ): FieldNeighbor[] {
    const neighbors: FieldNeighbor[] = [];
    const detect = (field: HTMLElement): FieldMappingResult =>
      detectionCache?.get(field) ??
      this.fieldDetector.detectWithConfidence(field);

    // Get 5 before
    for (let i = Math.max(0, currentIndex - 5); i < currentIndex; i++) {
      const field = fields[i];
      const mapping = detect(field);
      neighbors.push({
        distance: i - currentIndex,
        semanticType: mapping.semanticType || undefined,
        name: field.getAttribute('name') || undefined,
      });
    }

    // Get 5 after
    for (
      let i = currentIndex + 1;
      i < Math.min(fields.length, currentIndex + 6);
      i++
    ) {
      const field = fields[i];
      const mapping = detect(field);
      neighbors.push({
        distance: i - currentIndex,
        semanticType: mapping.semanticType || undefined,
        name: field.getAttribute('name') || undefined,
      });
    }

    return neighbors;
  }

  /**
   * Finds label text from sibling elements.
   *
   * @remarks
   * Checks immediate previous and next siblings for `<label>` tags.
   *
   * @param element - The field element.
   * @returns An array of found label texts.
   */
  private getSiblingLabels(element: HTMLElement): string[] {
    const labels: string[] = [];

    // Check previous sibling
    let prev = element.previousElementSibling;
    while (prev && labels.length < 3) {
      if (prev.tagName.toLowerCase() === 'label') {
        const text = prev.textContent?.trim();
        if (text) labels.push(text);
      }
      prev = prev.previousElementSibling;
    }

    // Check next sibling
    let next = element.nextElementSibling;
    while (next && labels.length < 5) {
      if (next.tagName.toLowerCase() === 'label') {
        const text = next.textContent?.trim();
        if (text) labels.push(text);
      }
      next = next.nextElementSibling;
    }

    return labels;
  }

  /**
   * Determines the primary label text for a field.
   *
   * @remarks
   * Checks in order: `aria-label`, `aria-labelledby`, `for` attribute on label,
   * parent label, and previous sibling label.
   *
   * @param element - The field element.
   * @returns The label text or `undefined` if not found.
   */
  private getLabelText(element: HTMLElement): string | undefined {
    // Check aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    // Check aria-labelledby
    const ariaLabelledBy = element.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
      const labelElement = document.getElementById(ariaLabelledBy);
      if (labelElement?.textContent) return labelElement.textContent.trim();
    }

    // Check associated label
    // Use getAttribute() to avoid DOM quirk where element.id returns <input name="id">
    const elementId = element.getAttribute('id');
    if (elementId) {
      const label = document.querySelector(`label[for="${elementId}"]`);
      if (label?.textContent) return label.textContent.trim();
    }

    // Check parent label
    const parentLabel = element.closest('label');
    if (parentLabel?.textContent) return parentLabel.textContent.trim();

    // Check previous sibling label
    let sibling = element.previousElementSibling;
    while (sibling) {
      if (sibling.tagName.toLowerCase() === 'label' && sibling.textContent) {
        return sibling.textContent.trim();
      }
      sibling = sibling.previousElementSibling;
    }

    return undefined;
  }

  /**
   * Calculates the distribution of semantic field types within a form.
   *
   * @param fields - The fields to analyze.
   * @returns A map of semantic types to their occurrence count.
   */
  private calculateFieldTypeDistribution(
    fields: FieldContext[],
    detectionCache: Map<HTMLElement, FieldMappingResult>
  ): Map<string, number> {
    const distribution = new Map<string, number>();

    for (const field of fields) {
      const cached = detectionCache.get(field.element);
      const type = cached?.semanticType || 'unknown';
      distribution.set(type, (distribution.get(type) || 0) + 1);
    }

    return distribution;
  }

  /**
   * Releases all cached data and internal references.
   */
  destroy(): void {
    this.clearCache();
  }
}
