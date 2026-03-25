/**
 * Extracts page schemas by analyzing forms and fields in the DOM.
 *
 * @remarks
 * Provides the {@link SchemaExtractor.extractPageSchema} method that was previously
 * part of the FillKit class. This module isolates schema extraction logic for
 * better separation of concerns.
 */

import type { PageSchema, SchemaExtractionOptions } from '../types/index.js';
import { FormDetector } from './FormDetector.js';
import { FieldDetector } from './FieldDetector.js';

/**
 * Dependencies required by SchemaExtractor.
 */
export interface SchemaExtractorDeps {
  /** Detects forms in the DOM */
  formDetector: FormDetector;
  /** Detects field types and extracts constraints */
  fieldDetector: FieldDetector;
}

/**
 * Extracts structured page schemas from the DOM.
 *
 * @remarks
 * Analyzes all forms and fields on a page, capturing their structure, semantic types,
 * and metadata. The resulting schema can be uploaded to the cloud or used for analysis.
 */
export class SchemaExtractor {
  private readonly formDetector: FormDetector;
  private readonly fieldDetector: FieldDetector;

  constructor(deps: SchemaExtractorDeps) {
    this.formDetector = deps.formDetector;
    this.fieldDetector = deps.fieldDetector;
  }

  /**
   * Extracts a comprehensive schema of the current page.
   *
   * @remarks
   * Analyzes all forms and fields on the page, capturing their structure, types,
   * and metadata. This schema can be uploaded to the cloud or used for analysis.
   *
   * @param options - Extraction options.
   * @returns A promise resolving to the {@link PageSchema}.
   */
  async extractPageSchema(
    options: SchemaExtractionOptions = {}
  ): Promise<PageSchema> {
    const scope = options.scope ?? document;

    // Find all forms
    const forms = this.formDetector.findForms(scope, {
      includeSelectors: options.includeSelectors,
      excludeSelectors: options.excludeSelectors,
    });

    const formSchemas = [];
    let position = 0;

    for (const form of forms) {
      // Generate form ID
      // Use getAttribute() to avoid DOM quirk where form.id returns <input name="id">
      const formId =
        form.getAttribute('id') ||
        form.getAttribute('name') ||
        `form-${Array.from(scope.querySelectorAll('form')).indexOf(form)}`;

      // Get form name
      // Use getAttribute() to avoid DOM quirk where form.name returns <input name="name">
      const formName = form.getAttribute('name') || undefined;

      // Get form title (from first heading, legend, or aria-label)
      let formTitle: string | undefined;
      const heading = form.querySelector('h1, h2, h3, h4, h5, h6');
      const legend = form.querySelector('legend');
      if (heading?.textContent) {
        formTitle = heading.textContent.trim();
      } else if (legend?.textContent) {
        formTitle = legend.textContent.trim();
      } else if (form.getAttribute('aria-label')) {
        formTitle = form.getAttribute('aria-label') || undefined;
      }

      // Get form action
      // Use getAttribute() to avoid DOM quirk where form.action returns <input name="action">
      const formAction = form.getAttribute('action') || undefined;

      // Get form method
      // Use getAttribute() to avoid DOM quirk where form.method returns <input name="method">
      const formMethod = form.getAttribute('method')?.toUpperCase() || 'GET';

      // Find all fields in this form
      const fields = this.formDetector.findFields(form, {
        includeSelectors: options.includeSelectors,
        excludeSelectors: options.excludeSelectors,
      });

      const fieldSchemas = [];

      for (const field of fields) {
        // Detect semantic type
        const detection = this.fieldDetector.detect(field);

        // Get field name
        const fieldName =
          field.getAttribute('name') ||
          field.getAttribute('id') ||
          `field-${position}`;

        // Get input type
        const inputType =
          field.getAttribute('type') || field.tagName.toLowerCase();

        // Get label text
        const label = this.fieldDetector.getLabelText(field);

        // Get placeholder
        const placeholder = field.getAttribute('placeholder') || undefined;

        // Get constraints
        const constraints = this.fieldDetector.extractConstraints(field);

        // Get required status
        const required =
          field.hasAttribute('required') ||
          field.hasAttribute('aria-required') ||
          constraints.required ||
          false;

        fieldSchemas.push({
          name: fieldName,
          semanticType: detection.semanticType,
          inputType,
          label: label || undefined,
          placeholder,
          constraints,
          position: position++,
          confidence: detection.confidence,
          required,
          detectedBy: 'sdk',
        });
      }

      formSchemas.push({
        formId,
        formName,
        formTitle,
        formAction,
        formMethod,
        fields: fieldSchemas,
      });
    }

    // Build page schema
    const url =
      typeof window !== 'undefined' ? window.location.href : 'about:blank';
    const title = typeof document !== 'undefined' ? document.title : '';
    const domain =
      typeof window !== 'undefined' ? window.location.hostname : 'localhost';

    // Extract metadata
    const description =
      typeof document !== 'undefined'
        ? (
            document.querySelector(
              'meta[name="description"]'
            ) as HTMLMetaElement
          )?.content || undefined
        : undefined;

    const ogDescription =
      typeof document !== 'undefined'
        ? (
            document.querySelector(
              'meta[property="og:description"]'
            ) as HTMLMetaElement
          )?.content || undefined
        : undefined;

    // Extract all headings by level
    const headings =
      typeof document !== 'undefined'
        ? {
            h1: Array.from(document.querySelectorAll('h1')).map(
              h => h.textContent?.trim() || ''
            ),
            h2: Array.from(document.querySelectorAll('h2')).map(
              h => h.textContent?.trim() || ''
            ),
            h3: Array.from(document.querySelectorAll('h3')).map(
              h => h.textContent?.trim() || ''
            ),
            h4: Array.from(document.querySelectorAll('h4')).map(
              h => h.textContent?.trim() || ''
            ),
            h5: Array.from(document.querySelectorAll('h5')).map(
              h => h.textContent?.trim() || ''
            ),
            h6: Array.from(document.querySelectorAll('h6')).map(
              h => h.textContent?.trim() || ''
            ),
          }
        : {
            h1: [],
            h2: [],
            h3: [],
            h4: [],
            h5: [],
            h6: [],
          };

    const pageSchema: PageSchema = {
      metadata: {
        url,
        title,
        domain,
        description,
        ogDescription,
        headings,
      },
      forms: formSchemas,
      timestamp: Date.now(),
    };

    return pageSchema;
  }
}
