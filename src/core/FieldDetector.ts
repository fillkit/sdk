/**
 * Detects semantic field types from DOM elements using multi-signal analysis.
 *
 * @remarks
 * Analyzes attributes, labels, placeholders, and patterns with confidence scoring.
 * Supports multilingual pattern matching and custom locale configurations.
 */

import {
  SemanticFieldType,
  type FieldTypeMetadata,
  FIELD_TYPE_REGISTRY,
} from '../types/semantic-fields.js';
import type {
  FieldConstraints,
  FieldElementDescriptor,
  FormContext,
} from '../types/index.js';
import {
  LOCALE_PATTERNS,
  type MultilingualPatterns,
} from '../locales/index.js';
import { ElementSelector } from '../utils/ElementSelector.js';
import {
  tokenize as tfidfTokenize,
  scoreAll as tfidfScoreAll,
} from '../utils/tfidf-scorer.js';

/** Cached array of all field type metadata — allocated once at module load. */
const ALL_FIELD_TYPES: readonly FieldTypeMetadata[] =
  Object.values(FIELD_TYPE_REGISTRY);

/** Shared empty map returned when TF-IDF has no text signals — avoids allocation. */
const EMPTY_TFIDF_SCORES: ReadonlyMap<string, number> = new Map<
  string,
  number
>();

/** Tag names that qualify as input elements. */
const INPUT_TAG_NAMES = new Set(['input', 'select', 'textarea']);

/** Pre-compiled whitespace regex for autocomplete token splitting. */
const WHITESPACE_RE = /\s+/;

/**
 * DOM signals extracted once per element to avoid redundant attribute reads.
 * Both getCandidates() and calculateConfidence() consume this struct.
 */
interface ElementSignals {
  explicitType: string | null;
  autocomplete: string;
  acHint: string | undefined;
  name: string;
  id: string;
  placeholder: string;
  labelText: string;
  inputType: string;
  tagName: string;
  inputMode: string;
  isInput: boolean;
  /** Lazily computed TF-IDF similarity scores: fieldType → cosine similarity. */
  tfidfScores: () => Map<string, number>;
}

/**
 * Maps HTML autocomplete attribute tokens to SemanticFieldType values.
 *
 * @remarks
 * Per the HTML spec, autocomplete tokens are the highest-fidelity signal
 * developers provide for field semantics. Section/shipping/billing prefixes
 * are stripped before lookup.
 *
 * @see https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofilling-form-controls:-the-autocomplete-attribute
 */
const AUTOCOMPLETE_MAP: Record<string, string> = {
  'given-name': SemanticFieldType.NAME_GIVEN,
  'additional-name': SemanticFieldType.MIDDLE_NAME,
  'family-name': SemanticFieldType.NAME_FAMILY,
  name: SemanticFieldType.FULL_NAME,
  'honorific-prefix': SemanticFieldType.PREFIX,
  'honorific-suffix': SemanticFieldType.SUFFIX,
  email: SemanticFieldType.EMAIL,
  tel: SemanticFieldType.PHONE,
  'tel-country-code': SemanticFieldType.COUNTRY_CODE,
  'street-address': SemanticFieldType.ADDRESS_LINE1,
  'address-line1': SemanticFieldType.ADDRESS_LINE1,
  'address-line2': SemanticFieldType.ADDRESS_LINE2,
  'address-level2': SemanticFieldType.CITY,
  'address-level1': SemanticFieldType.STATE,
  'postal-code': SemanticFieldType.POSTAL_CODE,
  'country-name': SemanticFieldType.COUNTRY,
  country: SemanticFieldType.COUNTRY,
  bday: SemanticFieldType.BIRTH_DATE,
  'bday-day': SemanticFieldType.DATE,
  'bday-month': SemanticFieldType.MONTH,
  'bday-year': SemanticFieldType.DATE,
  sex: SemanticFieldType.SEX,
  username: SemanticFieldType.USERNAME,
  'new-password': SemanticFieldType.PASSWORD,
  'current-password': SemanticFieldType.PASSWORD,
  'cc-name': SemanticFieldType.FULL_NAME,
  'cc-number': SemanticFieldType.CREDIT_CARD_NUMBER,
  'cc-exp': SemanticFieldType.CREDIT_CARD_EXPIRY,
  'cc-exp-month': SemanticFieldType.CREDIT_CARD_EXP_MONTH,
  'cc-exp-year': SemanticFieldType.CREDIT_CARD_EXP_YEAR,
  'cc-csc': SemanticFieldType.CREDIT_CARD_CVV,
  organization: SemanticFieldType.COMPANY,
  'organization-title': SemanticFieldType.JOB_TITLE,
  url: SemanticFieldType.URL,
  language: SemanticFieldType.LANGUAGE,
};

/**
 * Maps HTML inputmode attribute values to sets of compatible SemanticFieldTypes.
 *
 * @remarks
 * The inputmode attribute hints at the type of data expected, which can
 * corroborate or boost a candidate detection.
 */
const INPUTMODE_MAP: Record<string, Set<string>> = {
  email: new Set([SemanticFieldType.EMAIL]),
  tel: new Set([SemanticFieldType.PHONE, SemanticFieldType.FAX]),
  url: new Set([
    SemanticFieldType.URL,
    SemanticFieldType.WEBSITE,
    SemanticFieldType.DOMAIN,
  ]),
  numeric: new Set([
    SemanticFieldType.POSTAL_CODE,
    SemanticFieldType.ZIP_CODE,
    SemanticFieldType.CREDIT_CARD_NUMBER,
    SemanticFieldType.CREDIT_CARD_CVV,
    SemanticFieldType.OTP_CODE,
    SemanticFieldType.PIN_CODE,
    SemanticFieldType.AGE,
    SemanticFieldType.NUMBER_GENERIC,
    SemanticFieldType.INTEGER,
  ]),
  decimal: new Set([
    SemanticFieldType.DECIMAL,
    SemanticFieldType.PERCENTAGE,
    SemanticFieldType.LATITUDE,
    SemanticFieldType.LONGITUDE,
    SemanticFieldType.GPA,
  ]),
};

/**
 * Form context patterns that bias detection toward certain field types.
 *
 * @remarks
 * When a form's action, title, or legend text matches a pattern, fields
 * within that form receive a gentle confidence boost (+0.1) for the
 * associated semantic types.
 */
const FORM_CONTEXT_BIASES: Array<{
  formPatterns: RegExp[];
  boostTypes: Set<string>;
}> = [
  {
    formPatterns: [/checkout|payment|billing|purchase/i],
    boostTypes: new Set([
      SemanticFieldType.CREDIT_CARD_NUMBER,
      SemanticFieldType.CREDIT_CARD_EXPIRY,
      SemanticFieldType.CREDIT_CARD_CVV,
      SemanticFieldType.CREDIT_CARD_EXP_MONTH,
      SemanticFieldType.CREDIT_CARD_EXP_YEAR,
    ]),
  },
  {
    formPatterns: [/login|sign.?in|auth/i],
    boostTypes: new Set([
      SemanticFieldType.USERNAME,
      SemanticFieldType.PASSWORD,
      SemanticFieldType.EMAIL,
    ]),
  },
  {
    formPatterns: [/register|sign.?up|create.?account/i],
    boostTypes: new Set([
      SemanticFieldType.EMAIL,
      SemanticFieldType.PASSWORD,
      SemanticFieldType.USERNAME,
      SemanticFieldType.NAME_GIVEN,
      SemanticFieldType.NAME_FAMILY,
    ]),
  },
  {
    formPatterns: [/contact|inquiry|feedback/i],
    boostTypes: new Set([
      SemanticFieldType.FULL_NAME,
      SemanticFieldType.EMAIL,
      SemanticFieldType.PHONE,
      SemanticFieldType.COMPANY,
    ]),
  },
  {
    formPatterns: [/shipping|delivery|address/i],
    boostTypes: new Set([
      SemanticFieldType.ADDRESS_LINE1,
      SemanticFieldType.ADDRESS_LINE2,
      SemanticFieldType.CITY,
      SemanticFieldType.STATE,
      SemanticFieldType.POSTAL_CODE,
      SemanticFieldType.ZIP_CODE,
      SemanticFieldType.COUNTRY,
    ]),
  },
];

/**
 * Represents the result of a field detection analysis.
 *
 * @remarks
 * Contains the original element, a serializable descriptor, the detected semantic type,
 * confidence score, and extracted constraints.
 */
export interface FieldDetection {
  /** The DOM element that was analyzed */
  element: HTMLElement;
  /** Framework-agnostic element descriptor (serializable, preferred) */
  descriptor: FieldElementDescriptor;
  /** The detected semantic field type, or 'unknown' if no match found */
  semanticType: string;
  /** Confidence score from 0.0 to 1.0 indicating match quality */
  confidence: number;
  /** Extracted field constraints from HTML attributes */
  constraints: FieldConstraints;
  /** Complete metadata for the detected field type, or null if no match */
  metadata: FieldTypeMetadata | null;
}

/**
 * Internal result structure for field mapping logic.
 *
 * @remarks
 * Similar to {@link FieldDetection} but allows for null semantic types during
 * the detection process.
 */
export interface FieldMappingResult {
  /** The detected semantic field type, or null if no match found */
  semanticType: SemanticFieldType | null;
  /** Confidence score from 0.0 to 1.0 indicating match quality */
  confidence: number;
  /** Extracted field constraints from HTML attributes */
  constraints: FieldConstraints;
  /** Complete metadata for the detected field type, or null if no match */
  metadata: FieldTypeMetadata | null;
}

/**
 * The main class for detecting semantic field types from DOM elements.
 *
 * @remarks
 * Uses a combination of pattern matching (regex), attribute analysis, and heuristics
 * to determine the most likely semantic type for a given form field. It assigns a
 * confidence score to each match to indicate reliability.
 *
 * @example
 * ```ts
 * const detector = new FieldDetector('en');
 * const input = document.querySelector('input[type="email"]');
 * const detection = detector.detect(input);
 *
 * console.log(detection.semanticType); // 'email'
 * console.log(detection.confidence); // 0.95
 * console.log(detection.constraints); // { minlength: 5, maxlength: 254, required: true }
 * ```
 */
export class FieldDetector {
  /** Detector name for identification in plugin system */
  name = 'default';
  /** Priority for detector chain (higher runs first) */
  priority = 0;
  /** Current locale for pattern matching */
  private locale: string;
  /** Cached locale patterns for the current locale */
  private localePatterns: MultilingualPatterns | null = null;
  /** Label text cache for performance */
  private labelCache = new WeakMap<HTMLElement, string>();
  /** Minimum confidence score required for a detection to be accepted */
  private static readonly MIN_CONFIDENCE = 0.15;

  /**
   * Initializes a new instance of the FieldDetector.
   *
   * @param locale - The locale code for multilingual pattern matching (defaults to 'en').
   */
  constructor(locale: string = 'en') {
    this.locale = locale;
    this.loadLocalePatterns();
  }

  /**
   * Loads and caches regex patterns for the current locale.
   *
   * @remarks
   * Attempts to load patterns for the specific locale (e.g., 'en_US'). If not found,
   * falls back to the base language code (e.g., 'en').
   */
  private loadLocalePatterns(): void {
    // Try to load patterns for the specified locale
    this.localePatterns = LOCALE_PATTERNS[this.locale] || null;

    // If locale not found, try to extract language code (e.g., 'fr_FR' -> 'fr')
    if (!this.localePatterns && this.locale.includes('_')) {
      const languageCode = this.locale.split('_')[0];
      this.localePatterns = LOCALE_PATTERNS[languageCode] || null;
    }
  }

  /**
   * Updates the locale used for pattern matching.
   *
   * @remarks
   * Triggers a reload of locale-specific patterns. Useful for dynamic language switching.
   *
   * @param locale - The new locale code.
   */
  setLocale(locale: string): void {
    if (this.locale !== locale) {
      this.locale = locale;
      this.loadLocalePatterns();
    }
  }

  /**
   * Analyzes a DOM element to determine its semantic field type.
   *
   * @remarks
   * Returns a comprehensive {@link FieldDetection} object containing the detected type,
   * confidence score, constraints, and metadata.
   *
   * Confidence scoring guide:
   * - 1.0: Explicit `data-fillkit-type` attribute.
   * - 0.7-0.9: Strong match (input type + name/id pattern).
   * - 0.4-0.6: Medium match (input type or pattern match).
   * - 0.1-0.3: Weak match (label or placeholder only).
   * - 0.0: No match.
   *
   * @param element - The DOM element to analyze.
   * @returns The detection result.
   *
   * @example
   * ```ts
   * const result = detector.detect(phoneInput);
   * if (result.confidence > 0.7) {
   *   console.log(`High confidence: ${result.semanticType}`);
   * }
   * ```
   */
  detect(element: HTMLElement, formContext?: FormContext): FieldDetection {
    const result = this.detectWithConfidence(element, formContext);

    return {
      element,
      descriptor: this.createDescriptor(element),
      semanticType: result.semanticType || 'unknown',
      confidence: result.confidence,
      constraints: result.constraints,
      metadata: result.metadata,
    };
  }

  /**
   * Internal method to perform detection with confidence scoring.
   *
   * @param element - The DOM element to analyze.
   * @returns A {@link FieldMappingResult} containing the best match found.
   */
  detectWithConfidence(
    element: HTMLElement,
    formContext?: FormContext
  ): FieldMappingResult {
    // Skip non-input elements
    if (!this.isInputElement(element)) {
      return {
        semanticType: null,
        confidence: 0,
        constraints: {},
        metadata: null,
      };
    }

    const constraints = this.extractConstraints(element);

    // Extract DOM signals once — shared by getCandidates and calculateConfidence
    const signals = this.extractSignals(element);
    const candidates = this.getCandidates(signals);

    // Pre-compute form context boosted types once (not per-candidate)
    let boostedTypes: Set<string> | null = null;
    if (formContext) {
      const contextStr = [
        formContext.formAction,
        formContext.formTitle,
        ...(formContext.legendTexts || []),
      ].join(' ');
      for (const bias of FORM_CONTEXT_BIASES) {
        if (bias.formPatterns.some(p => p.test(contextStr))) {
          if (!boostedTypes) boostedTypes = new Set(bias.boostTypes);
          else bias.boostTypes.forEach(t => boostedTypes!.add(t));
        }
      }
    }

    // Find best match
    let bestMatch: FieldMappingResult = {
      semanticType: null,
      confidence: 0,
      constraints,
      metadata: null,
    };

    for (const candidate of candidates) {
      const confidence = this.calculateConfidence(
        signals,
        candidate,
        boostedTypes
      );
      if (confidence > bestMatch.confidence) {
        bestMatch = {
          semanticType: candidate.type,
          confidence,
          constraints,
          metadata: candidate,
        };
      }
    }

    // Reject matches below minimum confidence threshold
    if (
      bestMatch.confidence > 0 &&
      bestMatch.confidence < FieldDetector.MIN_CONFIDENCE
    ) {
      return {
        semanticType: null,
        confidence: 0,
        constraints,
        metadata: null,
      };
    }

    return bestMatch;
  }

  /**
   * Extracts validation constraints from standard HTML attributes.
   *
   * @remarks
   * Supports `HTMLInputElement`, `HTMLTextAreaElement`, and `HTMLSelectElement`.
   * Extracts attributes like `min`, `max`, `pattern`, `required`, `disabled`, etc.
   *
   * @param element - The element to extract constraints from.
   * @returns An object containing the extracted constraints.
   */
  extractConstraints(element: HTMLElement): FieldConstraints {
    const constraints: FieldConstraints = {};

    // Extract constraints for input elements
    if (element instanceof HTMLInputElement) {
      // Numeric constraints (for number, range, date, time, etc.)
      if (element.min !== '') constraints.min = parseFloat(element.min);
      if (element.max !== '') constraints.max = parseFloat(element.max);
      if (element.step !== '') constraints.step = parseFloat(element.step);

      // Text length constraints
      if (element.minLength !== -1) constraints.minlength = element.minLength;
      if (element.maxLength !== -1) constraints.maxlength = element.maxLength;

      // Pattern validation
      if (element.pattern) constraints.pattern = element.pattern;

      // Required validation
      constraints.required = element.required;

      // File input constraints
      if (element.type === 'file') {
        if (element.accept) constraints.accept = element.accept;
        if (element.multiple) constraints.multiple = element.multiple;
      }

      // Email/URL multiple values
      if (element.type === 'email' && element.multiple) {
        constraints.multiple = element.multiple;
      }

      // State constraints
      if (element.disabled) constraints.disabled = element.disabled;
      if (element.readOnly) constraints.readonly = element.readOnly;
    }

    // Extract constraints for textarea elements
    else if (element instanceof HTMLTextAreaElement) {
      // Text length constraints
      if (element.minLength !== -1) constraints.minlength = element.minLength;
      if (element.maxLength !== -1) constraints.maxlength = element.maxLength;

      // Required validation
      constraints.required = element.required;

      // State constraints
      if (element.disabled) constraints.disabled = element.disabled;
      if (element.readOnly) constraints.readonly = element.readOnly;
    }

    // Extract constraints for select elements
    else if (element instanceof HTMLSelectElement) {
      // Required validation
      constraints.required = element.required;

      // Multiple selection
      if (element.multiple) constraints.multiple = element.multiple;

      // State constraints
      if (element.disabled) constraints.disabled = element.disabled;

      // Size (visible options)
      if (element.size > 1) constraints.size = element.size;
    }

    return constraints;
  }

  /**
   * Determines the associated label text for a given element.
   *
   * @remarks
   * Checks sources in the following order:
   * 1. `aria-label` attribute
   * 2. `aria-labelledby` reference
   * 3. Associated `<label>` via `for` attribute
   * 4. Parent `<label>` element
   * 5. Previous sibling `<label>` element
   *
   * Results are cached using a `WeakMap` for performance.
   *
   * @param element - The element to find the label for.
   * @returns The label text, or an empty string if not found.
   */
  getLabelText(element: HTMLElement): string {
    // Check cache first
    const cached = this.labelCache.get(element);
    if (cached !== undefined) {
      return cached;
    }

    // Check aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
      this.labelCache.set(element, ariaLabel);
      return ariaLabel;
    }

    // Check aria-labelledby
    const ariaLabelledBy = element.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
      const labelElement = document.getElementById(ariaLabelledBy);
      if (labelElement) {
        const labelText = labelElement.textContent || '';
        this.labelCache.set(element, labelText);
        return labelText;
      }
    }

    // Check associated label
    // Use getAttribute() to avoid DOM quirk where element.id returns <input name="id">
    const elementId = element.getAttribute('id');
    if (elementId) {
      const label = document.querySelector(`label[for="${elementId}"]`);
      if (label) {
        const labelText = label.textContent || '';
        this.labelCache.set(element, labelText);
        return labelText;
      }
    }

    // Check parent label
    const parentLabel = element.closest('label');
    if (parentLabel) {
      const labelText = parentLabel.textContent || '';
      this.labelCache.set(element, labelText);
      return labelText;
    }

    // Check previous sibling label
    let sibling = element.previousElementSibling;
    while (sibling) {
      if (sibling.tagName.toLowerCase() === 'label') {
        const labelText = sibling.textContent || '';
        this.labelCache.set(element, labelText);
        return labelText;
      }
      sibling = sibling.previousElementSibling;
    }

    // Cache empty result
    this.labelCache.set(element, '');
    return '';
  }

  /**
   * Creates a serializable, framework-agnostic descriptor for an element.
   *
   * @remarks
   * Extracts all relevant attributes and state (value, checked, etc.) into a plain object.
   * This allows the element's state to be passed around without retaining a reference
   * to the DOM node itself.
   *
   * @param element - The HTMLElement to describe.
   * @returns A {@link FieldElementDescriptor} containing the element's properties.
   *
   * @example
   * ```ts
   * const input = document.querySelector('input[name="email"]');
   * const descriptor = detector.createDescriptor(input);
   * console.log(descriptor.tagName); // 'input'
   * console.log(descriptor.type); // 'email'
   * ```
   */
  createDescriptor(element: HTMLElement): FieldElementDescriptor {
    const tagName = element.tagName.toLowerCase() as
      | 'input'
      | 'textarea'
      | 'select';

    // Build the descriptor with all relevant attributes
    const descriptor: FieldElementDescriptor = {
      tagName,
      name: element.getAttribute('name') || undefined,
      // Use getAttribute() to avoid DOM quirk where element.id returns <input name="id">
      id: element.getAttribute('id') || undefined,
      type: element.getAttribute('type') || undefined,
      inputMode: element.getAttribute('inputmode') || undefined,

      // Display hints
      placeholder: element.getAttribute('placeholder') || undefined,
      ariaLabel: element.getAttribute('aria-label') || undefined,
      autocomplete: element.getAttribute('autocomplete') || undefined,

      // Constraints
      required: element.hasAttribute('required'),
      disabled: element.hasAttribute('disabled'),
      readonly: element.hasAttribute('readonly'),
      pattern: element.getAttribute('pattern') || undefined,
      minLength: this.getNumberAttribute(element, 'minlength'),
      maxLength: this.getNumberAttribute(element, 'maxlength'),
      min: element.getAttribute('min') || undefined,
      max: element.getAttribute('max') || undefined,
      step: element.getAttribute('step') || undefined,

      // Current state
      value:
        (element as HTMLInputElement | HTMLTextAreaElement).value || undefined,
      checked:
        (element as HTMLInputElement).checked !== undefined
          ? (element as HTMLInputElement).checked
          : undefined,

      // Relationships
      labelText: this.getLabelText(element) || undefined,
      // Use getAttribute() to avoid DOM quirk where form.id/name return child elements
      formId:
        element.closest('form')?.getAttribute('id') ||
        element.closest('form')?.getAttribute('name') ||
        undefined,

      // Position (will be set by caller if needed)
      position: undefined,

      // Selector for re-querying
      selector: ElementSelector.generate(element),
    };

    // Extract options for select elements
    if (tagName === 'select' && element instanceof HTMLSelectElement) {
      descriptor.options = this.extractSelectOptions(element);
    }

    return descriptor;
  }

  /**
   * Helper to extract and parse a numeric attribute.
   *
   * @param element - The element to read from.
   * @param attr - The name of the attribute.
   * @returns The parsed number, or `undefined` if missing or invalid.
   */
  private getNumberAttribute(
    element: HTMLElement,
    attr: string
  ): number | undefined {
    const value = element.getAttribute(attr);
    if (!value) return undefined;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? undefined : parsed;
  }

  /**
   * Extracts options from a `<select>` element.
   *
   * @param select - The select element.
   * @returns An array of option objects containing value, label, and selection state.
   */
  private extractSelectOptions(
    select: HTMLSelectElement
  ): Array<{ value: string; label: string; selected?: boolean }> {
    return Array.from(select.options).map(opt => ({
      value: opt.value,
      label: opt.label || opt.text,
      selected: opt.selected || undefined,
    }));
  }

  /**
   * Checks if an element is a valid input target for filling.
   *
   * @remarks
   * Includes `input`, `select`, `textarea`, and elements with `contenteditable="true"`.
   *
   * @param element - The element to check.
   * @returns `true` if the element is an input, `false` otherwise.
   */
  private isInputElement(element: HTMLElement): boolean {
    // cspell:ignore contenteditable
    return (
      INPUT_TAG_NAMES.has(element.tagName.toLowerCase()) ||
      element.contentEditable === 'true'
    );
  }

  /**
   * Checks if a value matches any locale-specific patterns for a given field type.
   *
   * @param fieldType - The semantic field type to check against.
   * @param value - The string value to test (e.g., name, label).
   * @param patternType - The category of pattern ('name', 'placeholder', 'label').
   * @returns `true` if a match is found, `false` otherwise.
   */
  private matchesLocalePattern(
    fieldType: string,
    value: string,
    patternType: 'name' | 'placeholder' | 'label'
  ): boolean {
    if (!this.localePatterns || !value) return false;

    const patterns = this.localePatterns[patternType][fieldType];
    if (!patterns || patterns.length === 0) return false;

    return patterns.some(pattern => pattern.test(value));
  }

  /**
   * Identifies potential semantic types for an element based on various signals.
   *
   * @remarks
   * Aggregates candidates from:
   * - Explicit `data-fillkit-type` attribute
   * - Input type (e.g., `type="email"`)
   * - Tag name (e.g., `select`, `textarea`)
   * - Regex matches against name, id, placeholder, and label
   *
   * @param element - The element to analyze.
   * @returns An array of unique candidate {@link FieldTypeMetadata} objects.
   */
  /**
   * Extracts all DOM signals from an element once, avoiding redundant reads.
   */
  private extractSignals(element: HTMLElement): ElementSignals {
    const autocomplete = element.getAttribute('autocomplete') || '';
    let acHint: string | undefined;
    if (autocomplete) {
      const acTokens = autocomplete.split(WHITESPACE_RE).filter(Boolean);
      acHint = acTokens
        .filter(
          t =>
            t !== 'on' &&
            t !== 'off' &&
            t !== 'shipping' &&
            t !== 'billing' &&
            !t.startsWith('section-')
        )
        .pop();
    }
    const isInput = element instanceof HTMLInputElement;
    const name = element.getAttribute('name') || '';
    const id = element.getAttribute('id') || '';
    const placeholder = element.getAttribute('placeholder') || '';
    const labelText = this.getLabelText(element);

    // Lazy TF-IDF: defer computation until first access.
    // Fields with data-fillkit-type or autocomplete often skip TF-IDF entirely.
    const textParts = [name, id, placeholder, labelText].filter(Boolean);
    let _tfidfScores: Map<string, number> | null = null;
    const locale = this.locale;
    const tfidfScores: () => Map<string, number> =
      textParts.length > 0
        ? () => {
            if (_tfidfScores === null) {
              const allTokens = tfidfTokenize(textParts.join(' '));
              _tfidfScores =
                allTokens.length > 0
                  ? tfidfScoreAll(allTokens, locale)
                  : new Map<string, number>();
            }
            return _tfidfScores;
          }
        : () => EMPTY_TFIDF_SCORES as Map<string, number>;

    return {
      explicitType: element.getAttribute('data-fillkit-type'),
      autocomplete,
      acHint,
      name,
      id,
      placeholder,
      labelText,
      inputType: isInput ? element.type.toLowerCase() : '',
      tagName: element.tagName.toLowerCase(),
      inputMode:
        (element as HTMLInputElement).inputMode ||
        element.getAttribute('inputmode') ||
        '',
      isInput,
      tfidfScores,
    };
  }

  /**
   * Single-pass candidate collection using pre-extracted signals.
   */
  private getCandidates(signals: ElementSignals): FieldTypeMetadata[] {
    // Check explicit data attribute first
    if (signals.explicitType && signals.explicitType in SemanticFieldType) {
      const metadata =
        FIELD_TYPE_REGISTRY[signals.explicitType as SemanticFieldType];
      if (metadata) return [metadata];
    }

    const seen = new Set<string>();
    const candidates: FieldTypeMetadata[] = [];

    const add = (meta: FieldTypeMetadata): void => {
      if (!seen.has(meta.type)) {
        seen.add(meta.type);
        candidates.push(meta);
      }
    };

    // Autocomplete lookup (O(1) map access)
    if (signals.acHint && AUTOCOMPLETE_MAP[signals.acHint]) {
      const mappedType = AUTOCOMPLETE_MAP[signals.acHint];
      const metadata = FIELD_TYPE_REGISTRY[mappedType as SemanticFieldType];
      if (metadata) add(metadata);
    }

    // Ensure fallback generics are included via direct O(1) registry lookup
    if (signals.tagName === 'select') {
      const selectGeneric =
        FIELD_TYPE_REGISTRY[SemanticFieldType.SELECT_GENERIC];
      if (selectGeneric) add(selectGeneric);
    } else if (signals.tagName === 'textarea') {
      const textareaGeneric =
        FIELD_TYPE_REGISTRY[SemanticFieldType.TEXTAREA_GENERIC];
      if (textareaGeneric) add(textareaGeneric);
    }
    if (
      signals.isInput &&
      (signals.inputType === 'checkbox' || signals.inputType === 'radio')
    ) {
      const booleanType = FIELD_TYPE_REGISTRY[SemanticFieldType.BOOLEAN];
      if (booleanType) add(booleanType);
    }

    // Single pass over all field types
    for (const type of ALL_FIELD_TYPES) {
      if (seen.has(type.type)) continue;

      // Input type match
      if (signals.isInput && type.inputTypes.has(signals.inputType)) {
        add(type);
        continue;
      }

      // Tag name match (select, textarea)
      if (type.inputTypes.has(signals.tagName)) {
        add(type);
        continue;
      }

      // Name/ID pattern match
      if (
        type.namePatterns.some(p => p.test(signals.name) || p.test(signals.id))
      ) {
        add(type);
        continue;
      }

      // Placeholder pattern match
      if (type.placeholderPatterns.some(p => p.test(signals.placeholder))) {
        add(type);
        continue;
      }

      // Label pattern match
      if (type.labelPatterns.some(p => p.test(signals.labelText))) {
        add(type);
        continue;
      }

      // Locale pattern matches
      if (
        this.localePatterns &&
        (this.matchesLocalePattern(type.type, signals.name, 'name') ||
          this.matchesLocalePattern(type.type, signals.id, 'name') ||
          this.matchesLocalePattern(
            type.type,
            signals.placeholder,
            'placeholder'
          ) ||
          this.matchesLocalePattern(type.type, signals.labelText, 'label'))
      ) {
        add(type);
      }
    }

    // TF-IDF text similarity candidates (conservative gate)
    const tfidfScores = signals.tfidfScores();
    if (tfidfScores.size > 0) {
      const TFIDF_CANDIDATE_THRESHOLD = 0.6;
      const MAX_TFIDF_CANDIDATES = 3;
      let tfidfAdded = 0;
      for (const [fieldType, score] of tfidfScores) {
        if (tfidfAdded >= MAX_TFIDF_CANDIDATES) break;
        if (score < TFIDF_CANDIDATE_THRESHOLD) continue;
        if (seen.has(fieldType)) continue;
        const metadata = FIELD_TYPE_REGISTRY[fieldType as SemanticFieldType];
        if (metadata) {
          add(metadata);
          tfidfAdded++;
        }
      }
    }

    return candidates;
  }

  /**
   * Calculates a confidence score for a specific field type candidate.
   *
   * @remarks
   * Assigns weights to different signals:
   * - Explicit type: 1.0
   * - Input type match: +0.3
   * - Tag name match: +0.2
   * - Name/ID pattern: +0.25
   * - Placeholder pattern: +0.15
   * - Label pattern: +0.1
   *
   * The total score is capped at 1.0.
   *
   * @param element - The element being analyzed.
   * @param metadata - The metadata for the candidate field type.
   * @returns A confidence score between 0.0 and 1.0.
   */
  /**
   * Calculates confidence using pre-extracted signals (no DOM reads).
   *
   * @param signals - Pre-extracted DOM signals.
   * @param metadata - The candidate field type metadata.
   * @param boostedTypes - Pre-computed set of types boosted by form context, or null.
   */
  private calculateConfidence(
    signals: ElementSignals,
    metadata: FieldTypeMetadata,
    boostedTypes: Set<string> | null
  ): number {
    let confidence = 0;

    // Explicit data attribute gets highest confidence
    if (signals.explicitType === metadata.type) {
      return 1.0;
    }

    // Autocomplete attribute match (highest signal after explicit type)
    if (signals.acHint && AUTOCOMPLETE_MAP[signals.acHint]) {
      if (AUTOCOMPLETE_MAP[signals.acHint] === metadata.type) {
        confidence += 0.9;
      }
    }

    // Input type match
    if (signals.isInput && metadata.inputTypes.has(signals.inputType)) {
      confidence += 0.3;
    }

    // Tag name match
    if (metadata.inputTypes.has(signals.tagName)) {
      confidence += 0.2;
    }

    // Name/id pattern match
    if (
      metadata.namePatterns.some(
        p => p.test(signals.name) || p.test(signals.id)
      )
    ) {
      confidence += 0.25;
    }

    // Placeholder pattern match
    if (metadata.placeholderPatterns.some(p => p.test(signals.placeholder))) {
      confidence += 0.15;
    }

    // Label pattern match
    if (metadata.labelPatterns.some(p => p.test(signals.labelText))) {
      confidence += 0.1;
    }

    // inputmode attribute match (supporting signal)
    if (
      signals.inputMode &&
      INPUTMODE_MAP[signals.inputMode]?.has(metadata.type)
    ) {
      confidence += 0.15;
    }

    // Form context bias (pre-computed, O(1) lookup)
    if (boostedTypes?.has(metadata.type)) {
      confidence += 0.1;
    }

    // TF-IDF text similarity boost (+0.0 to +0.2)
    const tfidfScore = signals.tfidfScores().get(metadata.type);
    if (tfidfScore !== undefined && tfidfScore > 0) {
      confidence += Math.min(tfidfScore * 0.25, 0.2);
    }

    return Math.min(confidence, 1.0);
  }
}
