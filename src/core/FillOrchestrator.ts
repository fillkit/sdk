/**
 * Orchestrates the complete autofill workflow.
 *
 * @remarks
 * Coordinates form detection, field detection, value generation, and filling with lifecycle events.
 * Acts as the central controller for the autofill process.
 */

import type {
  AutofillOptions,
  FillKitEventName,
  FillKitEventHandler,
  FieldConstraints,
  FieldElementDescriptor,
  FormIdentity,
} from '../types/index.js';
import { CancelableEvent } from '../types/index.js';
import { SemanticFieldType } from '../types/semantic-fields.js';
import { FormDetector } from './FormDetector.js';
import { FieldDetector, type FieldDetection } from './FieldDetector.js';
import { FormTracker } from './FormTracker.js';
import { ValueGenerator } from './ValueGenerator.js';
import { FieldFiller } from './FieldFiller.js';
import type { ProviderManager } from './ProviderManager.js';
import type { DatasetProvider } from '../types/index.js';
import type { ContextCollector } from './ContextCollector.js';
import { CloudProvider } from '../providers/CloudProvider.js';
import { createFormIdentity } from './FormIdentityFactory.js';
import { logger } from '@/core/Logger.js';

/** Events that support cancellation (sequential handler execution). */
const CANCELABLE_EVENTS: ReadonlySet<FillKitEventName> = new Set([
  'beforeScan',
  'beforeFill',
  'beforeApplyValue',
]);

/**
 * Sibling-context rules for refining ambiguous detections.
 * Hoisted to module scope to avoid per-call allocation.
 */
const SIBLING_RULES: ReadonlyArray<{
  readonly siblingTypes: ReadonlySet<string>;
  readonly ambiguousType: string;
  readonly refinedType: string;
  readonly minSiblings: number;
}> = [
  {
    siblingTypes: new Set([
      SemanticFieldType.CREDIT_CARD_NUMBER,
      SemanticFieldType.CREDIT_CARD_EXPIRY,
      SemanticFieldType.CREDIT_CARD_CVV,
      SemanticFieldType.CREDIT_CARD_EXP_MONTH,
      SemanticFieldType.CREDIT_CARD_EXP_YEAR,
    ]),
    ambiguousType: SemanticFieldType.FULL_NAME,
    refinedType: SemanticFieldType.FULL_NAME,
    minSiblings: 1,
  },
  {
    siblingTypes: new Set([
      SemanticFieldType.CREDIT_CARD_NUMBER,
      SemanticFieldType.CREDIT_CARD_EXPIRY,
      SemanticFieldType.CREDIT_CARD_CVV,
      SemanticFieldType.CREDIT_CARD_EXP_MONTH,
      SemanticFieldType.CREDIT_CARD_EXP_YEAR,
    ]),
    ambiguousType: SemanticFieldType.NAME_GIVEN,
    refinedType: SemanticFieldType.FULL_NAME,
    minSiblings: 1,
  },
];

/**
 * Represents detailed information about a processed field.
 *
 * @remarks
 * Includes the DOM element, its descriptor, detected type, constraints,
 * the value applied (if any), and error status.
 */
export interface FieldInfo {
  /** The DOM element processed */
  element: HTMLElement;
  /** Framework-agnostic descriptor of the element */
  descriptor: FieldElementDescriptor;
  /** The detected semantic type of the field */
  semanticType: SemanticFieldType | string;
  /** Validation constraints extracted from the field */
  constraints: FieldConstraints;
  /** The value applied to the field, or null if skipped */
  value: string | number | boolean | null;
  /** Indicates if an error occurred during processing */
  error?: boolean;
}

/**
 * The aggregate result of a fill operation.
 *
 * @remarks
 * Contains statistics about the operation, including counts of forms and fields processed,
 * filled, and skipped.
 */
export interface FillResult {
  /** Number of forms processed */
  formsCount: number;
  /** Field counts per form (keyed by form identifier) */
  fieldCountsPerForm: Map<string, number>;
  /** Total number of fields filled */
  totalFields: number;
  /** Number of fields successfully filled */
  filledCount: number;
  /** Number of fields skipped (no data available) */
  skippedCount: number;
  /** Detailed information about filled fields */
  fields: FieldInfo[];
}

/**
 * Orchestrates the complete autofill workflow.
 *
 * @remarks
 * Workflow:
 * 1. Detect forms and fields ({@link FormDetector})
 * 2. Detect field types ({@link FieldDetector})
 * 3. Generate values ({@link ValueGenerator})
 * 4. Apply values ({@link FieldFiller})
 * 5. Dispatch lifecycle events
 *
 * @example
 * ```ts
 * const orchestrator = new FillOrchestrator(
 *   formDetector,
 *   fieldDetector,
 *   formTracker,
 *   valueGenerator,
 *   fieldFiller
 * );
 *
 * const result = await orchestrator.autofillAll(options, eventHandlers);
 * console.log(`Filled ${result.totalFields} fields in ${result.formsCount} forms`);
 * ```
 */
export class FillOrchestrator {
  constructor(
    private formDetector: FormDetector,
    private fieldDetector: FieldDetector,
    private formTracker: FormTracker,
    private valueGenerator: ValueGenerator,
    private fieldFiller: FieldFiller,
    private providerManager?: ProviderManager,
    private provider?: DatasetProvider,
    private contextCollector?: ContextCollector
  ) {}

  /**
   * Updates the data provider reference.
   *
   * @remarks
   * Called after asynchronous initialization of the provider to ensure the orchestrator
   * has the correct data source.
   *
   * @param provider - The initialized dataset provider.
   */
  setProvider(provider: DatasetProvider): void {
    this.provider = provider;
  }

  /**
   * Autofills all forms within the specified scope.
   *
   * @remarks
   * Dispatches `beforeScan` and `afterScan` events. Processes forms in parallel for performance.
   *
   * @param options - Configuration options for the autofill operation.
   * @param eventHandlers - Map of lifecycle event handlers.
   * @returns A promise resolving to the {@link FillResult} with operation statistics.
   *
   * @example
   * ```ts
   * const result = await orchestrator.autofillAll({
   *   scope: document,
   *   mode: 'valid',
   *   force: false
   * }, eventHandlers);
   * ```
   */
  async autofillAll(
    options: AutofillOptions,
    eventHandlers: Map<FillKitEventName, FillKitEventHandler[]>
  ): Promise<FillResult> {
    const scope = options.scope || document;

    // Dispatch beforeScan event
    const canProceedScan = await this.dispatchEvent(
      'beforeScan',
      eventHandlers,
      { scope, forms: 0 }
    );

    if (!canProceedScan) {
      return this.createEmptyResult();
    }

    // Detect forms
    const forms = this.formDetector.findForms(scope, {
      includeSelectors: options.includeSelectors,
      excludeSelectors: options.excludeSelectors,
    });

    const allFields: FieldInfo[] = [];
    const fieldCountsPerForm = new Map<string, number>();

    // Process forms sequentially — autofillForm() uses FieldFiller batch mode
    // (startBatch/finalizeBatch) which relies on shared instance state, so
    // concurrent form processing would corrupt pendingClassAdds.
    for (const form of forms) {
      const formFields = await this.autofillForm(form, options, eventHandlers);
      const formId = this.getFormIdentifier(form);
      for (const field of formFields) {
        allFields.push(field);
      }
      fieldCountsPerForm.set(formId, formFields.length);
    }

    // Single-pass count of filled vs skipped
    let filledCount = 0;
    let skippedCount = 0;
    for (const f of allFields) {
      if (f.value !== null) filledCount++;
      else skippedCount++;
    }

    // Dispatch afterScan event
    await this.dispatchEvent('afterScan', eventHandlers, {
      scope,
      forms: forms.length,
      fields: allFields.length,
    });

    return {
      formsCount: forms.length,
      fieldCountsPerForm,
      totalFields: allFields.length,
      filledCount,
      skippedCount,
      fields: allFields,
    };
  }

  /**
   * Autofills a specific form or element.
   *
   * @remarks
   * Targets a single form or container element. Useful for filling specific sections of a page.
   *
   * @param target - The form or element to fill.
   * @param options - Configuration options.
   * @param eventHandlers - Lifecycle event handlers.
   * @returns A promise resolving to the {@link FillResult}.
   *
   * @example
   * ```ts
   * const form = document.querySelector('form');
   * const result = await orchestrator.autofill(form, options, eventHandlers);
   * ```
   */
  async autofill(
    target: HTMLFormElement | HTMLElement,
    options: AutofillOptions,
    eventHandlers: Map<FillKitEventName, FillKitEventHandler[]>
  ): Promise<FillResult> {
    // Dispatch beforeScan event
    const canProceedScan = await this.dispatchEvent(
      'beforeScan',
      eventHandlers,
      { target }
    );

    if (!canProceedScan) {
      return this.createEmptyResult();
    }

    const fields = await this.autofillForm(target, options, eventHandlers);

    const formId = this.getFormIdentifier(target);
    const fieldCountsPerForm = new Map<string, number>();
    fieldCountsPerForm.set(formId, fields.length);

    // Single-pass count of filled vs skipped
    let filledCount = 0;
    let skippedCount = 0;
    for (const f of fields) {
      if (f.value !== null) filledCount++;
      else skippedCount++;
    }

    // Dispatch afterScan event
    await this.dispatchEvent('afterScan', eventHandlers, {
      target,
      fields: fields.length,
    });

    return {
      formsCount: 1,
      fieldCountsPerForm,
      totalFields: fields.length,
      filledCount,
      skippedCount,
      fields,
    };
  }

  /**
   * Autofills the currently active form tracked by {@link FormTracker}.
   *
   * @remarks
   * If no form is currently active (user hasn't interacted with one), returns an empty result.
   *
   * @param options - Configuration options.
   * @param eventHandlers - Lifecycle event handlers.
   * @returns A promise resolving to the {@link FillResult}.
   *
   * @example
   * ```ts
   * const result = await orchestrator.autofillCurrent(options, eventHandlers);
   * ```
   */
  async autofillCurrent(
    options: AutofillOptions,
    eventHandlers: Map<FillKitEventName, FillKitEventHandler[]>
  ): Promise<FillResult> {
    const currentForm = this.formTracker.getCurrentForm();

    if (!currentForm) {
      logger.warn('No current form detected');
      return this.createEmptyResult();
    }

    return this.autofill(currentForm, options, eventHandlers);
  }

  /**
   * Clears all filled values within the specified scope.
   *
   * @param scope - The element or document to clear.
   */
  clear(scope: HTMLElement | Document): void {
    this.fieldFiller.clearAll(scope);
  }

  /**
   * Clears the currently active form.
   */
  clearCurrent(): void {
    const currentForm = this.formTracker.getCurrentForm();

    if (!currentForm) {
      logger.warn('No current form detected');
      return;
    }

    this.fieldFiller.clearAll(currentForm);
  }

  /**
   * Internal method to process a single form.
   *
   * @remarks
   * Handles field detection, value generation, and filling for a single form.
   * Implements performance optimizations like batch detection and classList updates.
   *
   * @param form - The form or element to fill.
   * @param options - Autofill options.
   * @param eventHandlers - Lifecycle event handlers.
   * @returns A promise resolving to an array of {@link FieldInfo} for processed fields.
   */
  private async autofillForm(
    form: HTMLFormElement | HTMLElement,
    options: AutofillOptions,
    eventHandlers: Map<FillKitEventName, FillKitEventHandler[]>
  ): Promise<FieldInfo[]> {
    // When the target is itself a form field (e.g., from inline fill per-field
    // mode), treat it as the single field to fill rather than searching its
    // (nonexistent) descendants.
    const tagName = form.tagName.toLowerCase();
    const isSingleField = ['input', 'textarea', 'select'].includes(tagName);

    // Detect fields
    const fields = isSingleField
      ? [form]
      : this.formDetector.findFields(form, {
          includeSelectors: options.includeSelectors,
          excludeSelectors: options.excludeSelectors,
          includeOutsideForms: options.includeOutsideForms,
        });

    const fieldInfos: FieldInfo[] = [];

    // Dispatch beforeFill event
    const canProceedFill = await this.dispatchEvent(
      'beforeFill',
      eventHandlers,
      { form, fields: fields.length }
    );

    if (!canProceedFill) {
      return [];
    }

    // Gather form context for context-biased detection.
    // For single fields, try to get context from the parent form element.
    const contextSource = isSingleField
      ? (form.closest('form') as HTMLFormElement | null)
      : form instanceof HTMLFormElement
        ? form
        : null;
    const formContext =
      this.contextCollector && contextSource
        ? this.contextCollector.getFormContext(contextSource)
        : undefined;

    // Batch detect all fields first to enable caching
    const detectionCache = new Map<HTMLElement, FieldDetection>();
    for (const field of fields) {
      detectionCache.set(field, this.fieldDetector.detect(field, formContext));
    }

    // Refine ambiguous detections using sibling context
    this.refineDetections(detectionCache, fields);

    // Create a shared identity for correlated form data (name → email → username).
    // Skip for single-field fills — nothing to correlate against.
    let formIdentity: FormIdentity | undefined;
    if (
      !isSingleField &&
      typeof this.provider?.getFakerInstance === 'function'
    ) {
      formIdentity = createFormIdentity(
        detectionCache,
        this.provider.getFakerInstance(options.locale)
      );
    }

    // Enable batch mode to defer classList operations
    this.fieldFiller.startBatch();

    try {
      // Fill all fields in parallel within the form (batch mode is active)
      const fieldPromises = fields.map(field =>
        this.fillField(
          field,
          options,
          eventHandlers,
          detectionCache.get(field),
          formIdentity
        ).catch(error => {
          logger.warn('Failed to fill field:', field, error);
          return this.createErrorFieldInfo(field);
        })
      );

      const filledFields = await Promise.all(fieldPromises);
      fieldInfos.push(...filledFields);
    } finally {
      // Finalize batch — apply all classList operations at once
      this.fieldFiller.finalizeBatch();
    }

    // Dispatch afterFill event — single-pass count
    let errorCount = 0;
    for (const f of fieldInfos) {
      if (f.error) errorCount++;
    }
    await this.dispatchEvent('afterFill', eventHandlers, {
      form,
      fields: fieldInfos.length,
      successful: fieldInfos.length - errorCount,
      errors: errorCount,
    });

    return fieldInfos;
  }

  /**
   * Internal method to process a single field.
   *
   * @remarks
   * Handles value generation, caching, and application for a single field.
   * Checks for user input before overwriting unless forced.
   *
   * @param element - The field element to fill.
   * @param options - Autofill options.
   * @param eventHandlers - Lifecycle event handlers.
   * @param cachedDetection - Optional cached detection result (Performance optimization).
   * @param formIdentity - Optional shared identity for correlated generation.
   * @returns A promise resolving to the {@link FieldInfo}.
   */
  private async fillField(
    element: HTMLElement,
    options: AutofillOptions,
    eventHandlers: Map<FillKitEventName, FillKitEventHandler[]>,
    cachedDetection?: FieldDetection,
    formIdentity?: FormIdentity
  ): Promise<FieldInfo> {
    // Skip if field has user input and force is not enabled
    if (!options.force && this.fieldFiller.hasUserInput(element)) {
      return this.createSkippedFieldInfo(element);
    }

    // Use cached detection if available, otherwise detect (Performance optimization: Phase 2)
    const detection = cachedDetection || this.fieldDetector.detect(element);

    if (!detection.semanticType || detection.semanticType === 'unknown') {
      return this.createSkippedFieldInfo(element);
    }

    // Check confidence threshold — but never gate <select> or <textarea> elements.
    // Select elements always pick from their existing DOM options, so semantic
    // detection confidence is irrelevant. Textareas likewise should always be filled
    // once any type is detected (they fall back to generic text generation).
    const tagName = element.tagName.toLowerCase();
    const bypassThreshold = tagName === 'select' || tagName === 'textarea';

    if (!bypassThreshold) {
      const minConfidence = options.minConfidence ?? 0.3;
      if (detection.confidence < minConfidence) {
        await this.dispatchEvent('lowConfidence', eventHandlers, {
          element,
          descriptor: detection.descriptor,
          semanticType: detection.semanticType,
          confidence: detection.confidence,
        });
        return this.createSkippedFieldInfo(element);
      }
    }

    // Generate value (each field gets a unique value — no cross-field caching)
    const value = await this.valueGenerator.generate(
      detection.semanticType as SemanticFieldType,
      {
        mode: options.mode,
        constraints: detection.constraints,
        element,
        overrides: options.overrides as Record<
          string,
          string | number | boolean | null
        >,
        locale: options.locale,
        formIdentity,
      }
    );

    // Skip field if CloudProvider returned null (no data available)
    if (value === null) {
      return this.createSkippedFieldInfo(element);
    }

    // Dispatch beforeApplyValue event
    const canApplyValue = await this.dispatchEvent(
      'beforeApplyValue',
      eventHandlers,
      { element, semanticType: detection.semanticType, value }
    );

    if (!canApplyValue) {
      // Value application was canceled
      return this.createSkippedFieldInfo(element);
    }

    // Determine fill source
    let source: 'cloud' | 'local' | undefined;
    if (this.provider && this.providerManager) {
      const isCloudProvider = this.provider instanceof CloudProvider;
      const hasCloudData =
        isCloudProvider &&
        this.providerManager.hasCloudData(detection.semanticType);

      if (hasCloudData) {
        source = 'cloud';
        this.providerManager.recordFill('cloud', detection.semanticType);
      } else {
        source = 'local';
        this.providerManager.recordFill('local', detection.semanticType);
      }
    }

    // Fill field
    this.fieldFiller.fill(element, value, source);

    // Dispatch fieldFilled event
    await this.dispatchEvent('fieldFilled', eventHandlers, {
      element,
      descriptor: detection.descriptor,
      semanticType: detection.semanticType,
      value,
      error: false,
    });

    return {
      element,
      descriptor: detection.descriptor,
      semanticType: detection.semanticType,
      constraints: detection.constraints,
      value,
    };
  }

  /**
   * Second-pass refinement of ambiguous detections using sibling context.
   *
   * @remarks
   * When a field's detection is ambiguous (low confidence), looks at surrounding
   * fields' detected types to disambiguate. For example, if sibling fields are
   * credit card number and expiry, an ambiguous "name" field is likely the
   * cardholder name rather than a person's name.
   *
   * @param detectionCache - Map of elements to their detections (mutated in place).
   * @param _fields - Array of field elements in DOM order.
   */
  private refineDetections(
    detectionCache: Map<HTMLElement, FieldDetection>,
    _fields: HTMLElement[]
  ): void {
    // Collect high-confidence sibling types without intermediate arrays
    const allTypes = new Set<string>();
    for (const detection of detectionCache.values()) {
      if (detection.confidence >= 0.5) {
        allTypes.add(detection.semanticType);
      }
    }

    for (const [element, detection] of detectionCache) {
      // High-confidence detections don't need refinement
      if (detection.confidence >= 0.7) continue;

      for (const rule of SIBLING_RULES) {
        if (detection.semanticType !== rule.ambiguousType) continue;
        // Count sibling matches without spreading the Set
        let siblingMatches = 0;
        for (const t of rule.siblingTypes) {
          if (allTypes.has(t)) siblingMatches++;
        }
        if (siblingMatches >= rule.minSiblings) {
          detectionCache.set(element, {
            ...detection,
            semanticType: rule.refinedType,
            confidence: Math.min(detection.confidence + 0.2, 1.0),
          });
          break;
        }
      }
    }
  }

  /**
   * Dispatches a lifecycle event to registered handlers.
   *
   * @remarks
   * Supports cancelable events (`beforeScan`, `beforeFill`, `beforeApplyValue`) which execute sequentially.
   * Non-cancelable events execute handlers in parallel for performance.
   *
   * @param eventName - The name of the event.
   * @param eventHandlers - The map of registered handlers.
   * @param data - The data associated with the event.
   * @returns `false` if the event was canceled, `true` otherwise.
   */
  private async dispatchEvent(
    eventName: FillKitEventName,
    eventHandlers: Map<FillKitEventName, FillKitEventHandler[]>,
    data: unknown
  ): Promise<boolean> {
    const handlers = eventHandlers.get(eventName);
    if (!handlers || handlers.length === 0) return true;

    const cancelable = new CancelableEvent();
    const isCancelable = CANCELABLE_EVENTS.has(eventName);

    if (isCancelable) {
      // Sequential execution for cancelable events
      for (const handler of handlers) {
        try {
          await handler(data, cancelable);
          if (cancelable.canceled) {
            return false; // Event canceled
          }
        } catch (error) {
          logger.error(`Error in ${eventName} handler:`, error);
        }
      }
    } else {
      // Parallel execution for non-cancelable events
      await Promise.all(
        handlers.map(handler =>
          Promise.resolve(handler(data, cancelable)).catch((error: unknown) => {
            logger.error(`Error in ${eventName} handler:`, error);
          })
        )
      );
    }

    return true; // Not canceled
  }

  /**
   * Generates or retrieves a unique identifier for a form.
   *
   * @param form - The form element.
   * @returns A unique string identifier (e.g., `#login-form` or `form-0`).
   */
  private formIndexCounter = 0;
  private formIdCache = new WeakMap<HTMLElement, string>();

  private getFormIdentifier(form: HTMLFormElement | HTMLElement): string {
    // Use getAttribute() to avoid DOM quirk where form.id returns <input name="id">
    const formId = form.getAttribute('id');
    if (formId) {
      return `#${formId}`;
    }

    // Return cached identifier to avoid repeated DOM queries
    const cached = this.formIdCache.get(form);
    if (cached) return cached;

    const id = `form-${this.formIndexCounter++}`;
    this.formIdCache.set(form, id);
    return id;
  }

  /**
   * Creates an empty {@link FillResult} object.
   *
   * @returns An initialized result object with zero counts.
   */
  private createEmptyResult(): FillResult {
    return {
      formsCount: 0,
      fieldCountsPerForm: new Map(),
      totalFields: 0,
      filledCount: 0,
      skippedCount: 0,
      fields: [],
    };
  }

  /**
   * Creates a {@link FieldInfo} object for a skipped field.
   *
   * @param element - The skipped element.
   * @returns Field info with null value.
   */
  private createSkippedFieldInfo(element: HTMLElement): FieldInfo {
    return {
      element,
      descriptor: this.fieldDetector.createDescriptor(element),
      semanticType: 'unknown',
      constraints: {},
      value: null,
    };
  }

  /**
   * Creates a {@link FieldInfo} object for a field that encountered an error.
   *
   * @param element - The element where the error occurred.
   * @returns Field info with error flag set.
   */
  private createErrorFieldInfo(element: HTMLElement): FieldInfo {
    return {
      element,
      descriptor: this.fieldDetector.createDescriptor(element),
      semanticType: 'unknown',
      constraints: {},
      value: null,
      error: true,
    };
  }
}
