/**
 * Manages the behavior configuration section of the options sheet.
 *
 * @remarks
 * This component handles user interactions for configuring autofill behavior,
 * including toggles for refill, watch mode, and outside forms. It also
 * manages advanced settings such as email domain configuration (local provider only),
 * CSS selectors for inclusion/exclusion, and field value overrides.
 */

import type { BehaviorOptions, OptionChangeHandler } from './types.js';
import {
  createSectionGroup,
  createCheckboxSection,
  createFormSection,
  createTextareaSection,
  parseSelectors,
  validateCSSSelector,
} from './form-helpers.js';
import type { BehaviorVisibility } from '../../../types/index.js';

export class BehaviorSection {
  private element: HTMLElement | null = null;
  private options: BehaviorOptions = {};
  private onChange?: OptionChangeHandler;
  private provider: 'local' | 'cloud' = 'local';
  private fieldVisibility: Required<BehaviorVisibility>;

  // Error elements for validation feedback
  private includeSelectorsError: HTMLElement | null = null;
  private excludeSelectorsError: HTMLElement | null = null;
  private overridesError: HTMLElement | null = null;

  /**
   * Initializes a new instance of the BehaviorSection class.
   *
   * @param options - Initial behavior options to populate the form.
   * @param provider - The current provider mode ('local' or 'cloud').
   * @param onChange - Callback function triggered when any option value changes.
   * @param fieldVisibility - Per-field visibility overrides.
   */
  constructor(
    options: BehaviorOptions = {},
    provider: 'local' | 'cloud' = 'local',
    onChange?: OptionChangeHandler,
    fieldVisibility?: Required<BehaviorVisibility>
  ) {
    this.options = options;
    this.provider = provider;
    this.onChange = onChange;
    this.fieldVisibility = fieldVisibility ?? {
      refill: true,
      watchMode: true,
      includeOutsideForms: true,
      emailDomain: true,
      includeSelectors: true,
      excludeSelectors: true,
      overrides: true,
    };
  }

  /**
   * Creates and renders the behavior section UI element.
   *
   * @returns The HTMLElement containing the constructed behavior section.
   */
  create(): HTMLElement {
    const section = createSectionGroup('Auto-Fill Behavior');

    // Refill Option
    const refillSection = createCheckboxSection(
      'Overwrite Existing Values',
      'refill',
      'Replace values in fields that are already filled',
      this.options.refill || false,
      value => this.handleChange('refill', value)
    );

    // Watch Mode Option
    const watchModeSection = createCheckboxSection(
      'Auto-Fill Dynamic Fields',
      'watchMode',
      'Fill new fields automatically when they appear (useful for multi-step forms)',
      this.options.watchMode || false,
      value => this.handleChange('watchMode', value)
    );

    // Outside Forms Option
    const outsideFormsSection = createCheckboxSection(
      'Fill All Input Fields',
      'includeOutsideForms',
      'Include standalone inputs not wrapped in &lt;form&gt; tags',
      this.options.includeOutsideForms || false,
      value => this.handleChange('includeOutsideForms', value)
    );

    if (this.fieldVisibility.refill) {
      section.appendChild(refillSection);
    }
    if (this.fieldVisibility.watchMode) {
      section.appendChild(watchModeSection);
    }
    if (this.fieldVisibility.includeOutsideForms) {
      section.appendChild(outsideFormsSection);
    }

    // Email Domain Option (Local Provider Only)
    if (this.fieldVisibility.emailDomain && this.provider === 'local') {
      const emailDomainSection = createFormSection(
        'Email Domain',
        'text',
        'emailDomain',
        undefined,
        this.options.emailDomain || 'fillkit.dev',
        'example.com',
        value => this.handleChange('emailDomain', value)
      );

      // Add description
      const emailDesc = document.createElement('div');
      emailDesc.className = 'fillkit-options-field-desc';
      emailDesc.textContent =
        'Domain for generated email addresses (e.g., company.com)';
      emailDomainSection.appendChild(emailDesc);

      section.appendChild(emailDomainSection);
    }

    // Include Selectors (Textarea)
    if (this.fieldVisibility.includeSelectors) {
      const includeSelectorsData = createTextareaSection(
        'Include Selectors (CSS)',
        'includeSelectors',
        'CSS selectors for fields to include (one per line or comma-separated)',
        this.options.includeSelectors?.join(', ') || '',
        'input.custom-field, .form-input',
        value => this.handleSelectorsChange('includeSelectors', value)
      );
      this.includeSelectorsError = includeSelectorsData.errorEl;
      section.appendChild(includeSelectorsData.section);
    }

    // Exclude Selectors (Textarea)
    if (this.fieldVisibility.excludeSelectors) {
      const excludeSelectorsData = createTextareaSection(
        'Exclude Selectors (CSS)',
        'excludeSelectors',
        'CSS selectors for fields to exclude (one per line or comma-separated)',
        this.options.excludeSelectors?.join(', ') || '',
        '.ignore, [data-skip]',
        value => this.handleSelectorsChange('excludeSelectors', value)
      );
      this.excludeSelectorsError = excludeSelectorsData.errorEl;
      section.appendChild(excludeSelectorsData.section);
    }

    // Field Overrides (Textarea with JSON validation)
    if (this.fieldVisibility.overrides) {
      const overridesData = createTextareaSection(
        'Field Overrides (JSON)',
        'overrides',
        'Override specific field values with custom data (JSON object)',
        this.options.overrides
          ? JSON.stringify(this.options.overrides, null, 2)
          : '',
        '{"email": "test@example.com", "city": "Cotonou"}',
        value => this.handleOverridesChange(value)
      );
      this.overridesError = overridesData.errorEl;
      section.appendChild(overridesData.section);
    }

    this.element = section.parentElement as HTMLElement;
    return this.element;
  }

  /**
   * Handles changes to simple checkbox or text input fields.
   *
   * @param field - The name of the field being updated.
   * @param value - The new value of the field.
   */
  private handleChange(field: string, value: boolean | string): void {
    (this.options as Record<string, unknown>)[field] = value;

    if (this.onChange) {
      this.onChange(field, value);
    }
  }

  /**
   * Handles changes to selector textareas, including validation and parsing.
   *
   * @param field - The name of the selector field ('includeSelectors' or 'excludeSelectors').
   * @param value - The raw string value from the textarea.
   */
  private handleSelectorsChange(field: string, value: string): void {
    const selectors = parseSelectors(value);
    const errorEl =
      field === 'includeSelectors'
        ? this.includeSelectorsError
        : this.excludeSelectorsError;

    // Validate all selectors
    const invalidSelectors = selectors.filter(s => !validateCSSSelector(s));

    if (invalidSelectors.length > 0 && errorEl) {
      errorEl.textContent = `Invalid selector(s): ${invalidSelectors.join(', ')}`;
      errorEl.style.display = 'block';
    } else if (errorEl) {
      errorEl.style.display = 'none';
    }

    // Update options with parsed selectors
    (this.options as Record<string, unknown>)[field] = selectors;

    if (this.onChange) {
      this.onChange(field, selectors);
    }
  }

  /**
   * Handles changes to the overrides JSON textarea.
   *
   * @remarks
   * Validates that the input is a valid JSON object. Updates the error display
   * if validation fails.
   *
   * @param value - The raw JSON string from the textarea.
   */
  private handleOverridesChange(value: string): void {
    if (!value || value.trim().length === 0) {
      // Empty is valid
      this.options.overrides = {};
      if (this.overridesError) {
        this.overridesError.style.display = 'none';
      }
      if (this.onChange) {
        this.onChange('overrides', {});
      }
      return;
    }

    try {
      const parsed = JSON.parse(value);

      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Must be a JSON object, not an array');
      }

      // Valid JSON object
      this.options.overrides = parsed;
      if (this.overridesError) {
        this.overridesError.style.display = 'none';
      }

      if (this.onChange) {
        this.onChange('overrides', parsed);
      }
    } catch (error) {
      // Invalid JSON
      if (this.overridesError) {
        this.overridesError.textContent = `Invalid JSON: ${(error as Error).message}`;
        this.overridesError.style.display = 'block';
      }
    }
  }

  /**
   * Retrieves the current configuration values from the UI.
   *
   * @returns A BehaviorOptions object containing the current state of all fields.
   */
  getValues(): BehaviorOptions {
    if (!this.element) return this.options;

    const refillCheckbox = this.element.querySelector(
      '[name="refill"]'
    ) as HTMLInputElement;
    const watchModeCheckbox = this.element.querySelector(
      '[name="watchMode"]'
    ) as HTMLInputElement;
    const outsideFormsCheckbox = this.element.querySelector(
      '[name="includeOutsideForms"]'
    ) as HTMLInputElement;
    const emailDomainInput = this.element.querySelector(
      '[name="emailDomain"]'
    ) as HTMLInputElement;
    const includeSelectorsTextarea = this.element.querySelector(
      '[name="includeSelectors"]'
    ) as HTMLTextAreaElement;
    const excludeSelectorsTextarea = this.element.querySelector(
      '[name="excludeSelectors"]'
    ) as HTMLTextAreaElement;
    const overridesTextarea = this.element.querySelector(
      '[name="overrides"]'
    ) as HTMLTextAreaElement;

    const values: BehaviorOptions = {
      refill: refillCheckbox?.checked || false,
      watchMode: watchModeCheckbox?.checked || false,
      includeOutsideForms: outsideFormsCheckbox?.checked || false,
    };

    if (emailDomainInput?.value) {
      values.emailDomain = emailDomainInput.value;
    }

    if (includeSelectorsTextarea?.value) {
      values.includeSelectors = parseSelectors(includeSelectorsTextarea.value);
    }

    if (excludeSelectorsTextarea?.value) {
      values.excludeSelectors = parseSelectors(excludeSelectorsTextarea.value);
    }

    if (overridesTextarea?.value) {
      try {
        values.overrides = JSON.parse(overridesTextarea.value);
      } catch {
        // Keep existing overrides if JSON is invalid
        values.overrides = this.options.overrides || {};
      }
    }

    return values;
  }

  /**
   * Updates the UI to reflect the provided options.
   *
   * @param options - A partial set of options to update in the UI.
   */
  updateValues(options: Partial<BehaviorOptions>): void {
    this.options = { ...this.options, ...options };

    if (!this.element) return;

    const refillCheckbox = this.element.querySelector(
      '[name="refill"]'
    ) as HTMLInputElement;
    const watchModeCheckbox = this.element.querySelector(
      '[name="watchMode"]'
    ) as HTMLInputElement;
    const outsideFormsCheckbox = this.element.querySelector(
      '[name="includeOutsideForms"]'
    ) as HTMLInputElement;
    const emailDomainInput = this.element.querySelector(
      '[name="emailDomain"]'
    ) as HTMLInputElement;
    const includeSelectorsTextarea = this.element.querySelector(
      '[name="includeSelectors"]'
    ) as HTMLTextAreaElement;
    const excludeSelectorsTextarea = this.element.querySelector(
      '[name="excludeSelectors"]'
    ) as HTMLTextAreaElement;
    const overridesTextarea = this.element.querySelector(
      '[name="overrides"]'
    ) as HTMLTextAreaElement;

    if (refillCheckbox && options.refill !== undefined) {
      refillCheckbox.checked = options.refill;
    }
    if (watchModeCheckbox && options.watchMode !== undefined) {
      watchModeCheckbox.checked = options.watchMode;
    }
    if (outsideFormsCheckbox && options.includeOutsideForms !== undefined) {
      outsideFormsCheckbox.checked = options.includeOutsideForms;
    }
    if (emailDomainInput && options.emailDomain !== undefined) {
      emailDomainInput.value = options.emailDomain;
    }
    if (includeSelectorsTextarea && options.includeSelectors !== undefined) {
      includeSelectorsTextarea.value = options.includeSelectors.join(', ');
    }
    if (excludeSelectorsTextarea && options.excludeSelectors !== undefined) {
      excludeSelectorsTextarea.value = options.excludeSelectors.join(', ');
    }
    if (overridesTextarea && options.overrides !== undefined) {
      overridesTextarea.value = JSON.stringify(options.overrides, null, 2);
    }
  }

  /**
   * Updates the current provider mode.
   *
   * @remarks
   * This affects conditional rendering, such as the visibility of the email domain field.
   * Note that a re-render (calling `create()`) may be required to reflect changes.
   *
   * @param provider - The new provider mode.
   */
  updateProvider(provider: 'local' | 'cloud'): void {
    this.provider = provider;
    // Note: Requires re-create() to show/hide email domain field
  }

  /**
   * Makes the behavior section visible.
   */
  show(): void {
    if (this.element) {
      this.element.style.display = 'block';
    }
  }

  /**
   * Hides the behavior section.
   */
  hide(): void {
    if (this.element) {
      this.element.style.display = 'none';
    }
  }
}
