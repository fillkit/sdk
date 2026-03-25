/**
 * SchemaBuilder - Build rich page schemas with context
 *
 * Extracts form metadata, field metadata, and contextual information
 * from parsed HTML documents for AI-powered field detection.
 */

import type {
  PageSchema,
  PageMetadata,
  FormSchema,
  FieldSchema,
  FieldConstraints,
} from '../types/index.js';
import { buildAttributeSelector } from '../utils/dom-helpers.js';

/**
 * Builds rich page schemas with contextual information.
 *
 * @remarks
 * Extracts form metadata, field metadata, and contextual information from parsed
 * HTML documents. Provides comprehensive schema data for AI-powered field detection
 * and semantic type classification.
 *
 * @example
 * ```ts
 * const builder = new SchemaBuilder();
 * const schema = builder.buildPageSchema(document, window.location.href);
 * console.log(`Found ${schema.forms.length} forms`);
 * ```
 */
export class SchemaBuilder {
  /**
   * Builds a complete page schema from a document.
   *
   * @remarks
   * Extracts page metadata (title, description, headings) and all forms with their fields.
   * Each field includes contextual information like labels, placeholders, constraints,
   * and surrounding elements.
   *
   * @param document - Parsed HTML document.
   * @param url - Page URL.
   * @returns Complete page schema with metadata and forms.
   */
  buildPageSchema(document: Document, url: string): PageSchema {
    const metadata = this.extractMetadata(document, url);
    const forms = this.extractForms(document);

    return {
      metadata,
      forms,
    };
  }

  /**
   * Extracts page metadata.
   *
   * @remarks
   * Collects title, meta descriptions, headings (h1-h6), and domain information.
   * This metadata provides context for understanding the page's purpose and content.
   *
   * @param document - Parsed HTML document.
   * @param url - Page URL.
   * @returns Page metadata object.
   */
  private extractMetadata(document: Document, url: string): PageMetadata {
    // Extract title
    const title = document.title || '';

    // Extract description (meta tags)
    const description =
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute('content') || undefined;

    const ogDescription =
      document
        .querySelector('meta[property="og:description"]')
        ?.getAttribute('content') || undefined;

    // Extract all headings
    const headings = {
      h1: this.extractHeadings(document, 'h1'),
      h2: this.extractHeadings(document, 'h2'),
      h3: this.extractHeadings(document, 'h3'),
      h4: this.extractHeadings(document, 'h4'),
      h5: this.extractHeadings(document, 'h5'),
      h6: this.extractHeadings(document, 'h6'),
    };

    // Parse URL
    let domain = '';
    try {
      domain = new URL(url).hostname;
    } catch {
      domain = 'localhost';
    }

    return {
      url,
      title,
      description,
      ogDescription,
      headings,
      domain,
    };
  }

  /**
   * Extracts headings of a specific level.
   *
   * @param document - Parsed HTML document.
   * @param tag - Heading tag name (h1, h2, etc.).
   * @returns Array of heading text content.
   */
  private extractHeadings(document: Document, tag: string): string[] {
    const elements = document.querySelectorAll(tag);
    const headings: string[] = [];

    elements.forEach(el => {
      const text = el.textContent?.trim();
      if (text) {
        headings.push(text);
      }
    });

    return headings;
  }

  /**
   * Extracts all forms from a document.
   *
   * @remarks
   * Finds all form elements and builds schemas for each, including only forms
   * that contain at least one field.
   *
   * @param document - Parsed HTML document.
   * @returns Array of form schemas.
   */
  private extractForms(document: Document): FormSchema[] {
    const forms = document.querySelectorAll('form');
    const formSchemas: FormSchema[] = [];
    let formIndex = 0;

    forms.forEach(form => {
      const formSchema = this.buildFormSchema(form, formIndex, document);
      if (formSchema.fields.length > 0) {
        // Only include forms with fields
        formSchemas.push(formSchema);
        formIndex++;
      }
    });

    return formSchemas;
  }

  /**
   * Builds a schema for a single form.
   *
   * @remarks
   * Extracts form attributes (id, name, action, method), title, and all fields.
   * Uses `getAttribute()` to avoid DOM quirks where properties may return child elements.
   *
   * @param form - Form element.
   * @param index - Form index in the document.
   * @param document - Parsed HTML document.
   * @returns Form schema with metadata and fields.
   */
  private buildFormSchema(
    form: HTMLFormElement,
    index: number,
    document: Document
  ): FormSchema {
    // Generate form ID
    // Use getAttribute() to avoid DOM quirk where form.id returns <input name="id">
    const formId =
      form.getAttribute('id') || form.getAttribute('name') || `form-${index}`;
    const formName = form.getAttribute('name') || undefined;

    // Get form title (from heading, legend, or aria-label)
    const formTitle = this.extractFormTitle(form);

    // Get form action and method
    // Use getAttribute() to avoid DOM quirk where form.action returns <input name="action">
    const formAction = form.getAttribute('action') || undefined;
    const formMethod = form.getAttribute('method')?.toUpperCase() || 'GET';

    // Extract all fields
    const fields = this.extractFields(form, document);

    return {
      formId,
      formName,
      formTitle,
      formAction,
      formMethod,
      fields,
    };
  }

  /**
   * Extracts form title from various sources.
   *
   * @remarks
   * Tries multiple strategies to find the form title:
   * 1. Heading element (h1-h6) inside the form
   * 2. Legend element
   * 3. aria-label attribute
   *
   * @param form - Form element.
   * @returns Form title, or `undefined` if not found.
   */
  private extractFormTitle(form: HTMLFormElement): string | undefined {
    // Try heading inside form
    const heading = form.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading?.textContent) {
      return heading.textContent.trim();
    }

    // Try legend
    const legend = form.querySelector('legend');
    if (legend?.textContent) {
      return legend.textContent.trim();
    }

    // Try aria-label
    const ariaLabel = form.getAttribute('aria-label');
    if (ariaLabel) {
      return ariaLabel;
    }

    return undefined;
  }

  /**
   * Extracts all fields from a form.
   *
   * @remarks
   * Finds all input, select, and textarea elements (excluding hidden, submit, reset, button types).
   * Builds field schemas with full context for each.
   *
   * @param form - Form element.
   * @param document - Parsed HTML document.
   * @returns Array of field schemas.
   */
  private extractFields(
    form: HTMLFormElement,
    document: Document
  ): FieldSchema[] {
    const selector =
      'input:not([type="submit"]):not([type="reset"]):not([type="button"]):not([type="hidden"]), select:not([data-fillkit-ignore]), textarea:not([data-fillkit-ignore])';
    const elements = form.querySelectorAll(selector);
    const fields: FieldSchema[] = [];
    let position = 0;

    elements.forEach(element => {
      const field = this.buildFieldSchema(
        element as HTMLElement,
        form,
        document,
        position
      );
      if (field) {
        fields.push(field);
        position++;
      }
    });

    return fields;
  }

  /**
   * Builds a schema for a single field with full context.
   *
   * @remarks
   * Extracts field attributes, labels, placeholders, constraints, and contextual information
   * like nearest heading, fieldset legend, and visual position. This rich context enables
   * accurate semantic type detection.
   *
   * @param field - Field element.
   * @param form - Parent form element.
   * @param document - Parsed HTML document.
   * @param position - Field position within the form.
   * @returns Field schema, or `null` if the field should be ignored.
   */
  private buildFieldSchema(
    field: HTMLElement,
    form: HTMLFormElement,
    document: Document,
    position: number
  ): FieldSchema | null {
    // Get basic attributes
    // Use getAttribute() to avoid DOM quirk where field.id returns <input name="id">
    const name =
      field.getAttribute('name') ||
      field.getAttribute('id') ||
      `field-${position}`;
    const inputType = field.getAttribute('type') || field.tagName.toLowerCase();
    const elementType = field.tagName.toLowerCase(); // input, select, or textarea
    const id = field.getAttribute('id') || undefined;

    // Get labels and text
    const label = this.findLabel(field);
    const placeholder = field.getAttribute('placeholder') || undefined;
    const ariaLabel = field.getAttribute('aria-label') || undefined;

    // Extract constraints
    const constraints = this.extractConstraints(field);

    // Build context
    const context = this.buildFieldContext(field, form, document);

    // Get required status
    const required =
      field.hasAttribute('required') ||
      field.getAttribute('aria-required') === 'true' ||
      constraints.required ||
      false;

    return {
      name,
      semanticType: 'text', // Default, will be detected properly later
      inputType,
      type: elementType,
      id,
      label,
      placeholder,
      ariaLabel,
      constraints,
      context,
      position,
      required,
      detectedBy: 'sdk',
      confidence: undefined, // Will be set by AI later
    };
  }

  /**
   * Finds the label for a field.
   *
   * @remarks
   * Tries multiple strategies:
   * 1. Explicit label with `for` attribute matching field ID
   * 2. Parent label element
   * 3. Previous sibling label element
   *
   * @param field - Field element.
   * @returns Label text, or `undefined` if not found.
   */
  private findLabel(field: HTMLElement): string | undefined {
    // Try explicit label (for attribute)
    // Use getAttribute() to avoid DOM quirk where field.id returns <input name="id">
    const fieldId = field.getAttribute('id');
    if (fieldId) {
      const label = document.querySelector(
        `label${buildAttributeSelector('for', fieldId)}`
      );
      if (label?.textContent) {
        return label.textContent.trim();
      }
    }

    // Try parent label
    const parentLabel = field.closest('label');
    if (parentLabel?.textContent) {
      // Remove field value from label text
      let labelText = parentLabel.textContent.trim();
      const fieldValue = (field as HTMLInputElement).value;
      if (fieldValue) {
        labelText = labelText.replace(fieldValue, '').trim();
      }
      return labelText;
    }

    // Try previous sibling label
    const prevSibling = field.previousElementSibling;
    if (prevSibling?.tagName === 'LABEL' && prevSibling.textContent) {
      return prevSibling.textContent.trim();
    }

    return undefined;
  }

  /**
   * Extracts field constraints from HTML attributes.
   *
   * @remarks
   * Parses validation attributes like required, pattern, minlength, maxlength,
   * min, max, and step.
   *
   * @param field - Field element.
   * @returns Field constraints object.
   */
  private extractConstraints(field: HTMLElement): FieldConstraints {
    const minAttr = field.getAttribute('min');
    const maxAttr = field.getAttribute('max');
    const stepAttr = field.getAttribute('step');

    return {
      required:
        field.hasAttribute('required') ||
        field.getAttribute('aria-required') === 'true',
      pattern: field.getAttribute('pattern') || undefined,
      minlength: field.hasAttribute('minlength')
        ? parseInt(field.getAttribute('minlength')!, 10)
        : undefined,
      maxlength: field.hasAttribute('maxlength')
        ? parseInt(field.getAttribute('maxlength')!, 10)
        : undefined,
      min: minAttr ? parseFloat(minAttr) : undefined,
      max: maxAttr ? parseFloat(maxAttr) : undefined,
      step: stepAttr ? parseFloat(stepAttr) : undefined,
    };
  }

  /**
   * Builds field context for AI-powered detection.
   *
   * @remarks
   * Collects contextual information including nearest heading, fieldset legend,
   * form context, and visual position. This context helps AI models understand
   * the field's purpose and semantic type.
   *
   * @param field - Field element.
   * @param form - Parent form element.
   * @param document - Parsed HTML document.
   * @returns Field context object.
   */
  private buildFieldContext(
    field: HTMLElement,
    form: HTMLFormElement,
    document: Document
  ): NonNullable<FieldSchema['context']> {
    return {
      nearestHeading: this.findNearestHeading(field, document),
      fieldsetLegend: this.findFieldsetLegend(field),
      formContext: {
        // Use getAttribute() to avoid DOM quirk where form properties return child elements
        formId: form.getAttribute('id') || undefined,
        formName: form.getAttribute('name') || undefined,
        formAction: form.getAttribute('action') || undefined,
        formMethod: form.getAttribute('method') || 'GET',
      },
      visualPosition: this.getVisualPosition(field),
    };
  }

  /**
   * Finds the nearest heading above a field.
   *
   * @remarks
   * Walks up the DOM tree to find the nearest heading (h1-h6). If not found in
   * ancestors, searches for the previous heading in document order.
   *
   * @param field - Field element.
   * @param document - Parsed HTML document.
   * @returns Heading text, or `undefined` if not found.
   */
  private findNearestHeading(
    field: HTMLElement,
    document: Document
  ): string | undefined {
    // Walk up DOM tree to find nearest heading
    let current = field.parentElement;

    while (current && current !== document.body) {
      const heading = current.querySelector('h1, h2, h3, h4, h5, h6');
      if (heading?.textContent) {
        return heading.textContent.trim();
      }
      current = current.parentElement;
    }

    // If not found in ancestors, look for previous heading in document
    const allHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let nearestHeading: HTMLElement | null = null;

    for (const heading of allHeadings) {
      if (
        heading.compareDocumentPosition(field) &
        Node.DOCUMENT_POSITION_FOLLOWING
      ) {
        nearestHeading = heading as HTMLElement;
      }
    }

    return nearestHeading?.textContent?.trim();
  }

  /**
   * Finds the fieldset legend for a field.
   *
   * @remarks
   * Looks for the closest fieldset ancestor and returns its legend text.
   *
   * @param field - Field element.
   * @returns Legend text, or `undefined` if not found.
   */
  private findFieldsetLegend(field: HTMLElement): string | undefined {
    const fieldset = field.closest('fieldset');
    if (fieldset) {
      const legend = fieldset.querySelector('legend');
      return legend?.textContent?.trim();
    }
    return undefined;
  }

  /**
   * Gets the visual position of a field in the viewport.
   *
   * @remarks
   * Calculates the center point of the field's bounding rectangle.
   * Returns `undefined` if position cannot be determined.
   *
   * @param field - Field element.
   * @returns Object with x and y coordinates, or `undefined`.
   */
  private getVisualPosition(
    field: HTMLElement
  ): { x: number; y: number } | undefined {
    try {
      const rect = field.getBoundingClientRect();
      return {
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2),
      };
    } catch {
      return undefined;
    }
  }
}
