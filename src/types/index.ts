/**
 * FillKit SDK Core Types and Interfaces
 *
 * This module defines all the core types, interfaces, and error classes
 * used throughout the FillKit SDK.
 */

import type { Faker } from '@faker-js/faker';
import type { TokenProvider } from './token-provider.js';

/**
 * Fill mode determines whether generated values should pass or fail validation
 */
export type FillMode = 'valid' | 'invalid';

/**
 * UI placement options for FillKit controls
 */
export type UiPlacement =
  | 'bottom.center'
  | 'top.center'
  | 'left.center'
  | 'right.center'
  | 'form.header'
  | 'form.footer';

// ============================================================================
// UI Visibility Configuration
// ============================================================================

/** Fields within the Provider & Mode section */
export interface ProviderModeVisibility {
  /** Data Source select (local/cloud). Default: true */
  provider?: boolean;
  /** Validation Mode select (valid/invalid). Default: true */
  mode?: boolean;
}

/** Fields within the Cloud Config section */
export interface CloudConfigVisibility {
  /** API key input + save/cancel. Default: true */
  apiKey?: boolean;
  /** Project selector dropdown. Default: true */
  projectSelector?: boolean;
  /** Dataset status pills (version, last sync). Default: true */
  datasetStatus?: boolean;
  /** Actions: scan page, refresh datasets, bulk scanner. Default: true */
  actions?: boolean;
}

/** Fields within the Behavior section */
export interface BehaviorVisibility {
  /** "Overwrite Existing Values" checkbox (refill). Default: true */
  refill?: boolean;
  /** "Auto-Fill Dynamic Fields" checkbox (watchMode). Default: true */
  watchMode?: boolean;
  /** "Fill All Input Fields" checkbox (includeOutsideForms). Default: true */
  includeOutsideForms?: boolean;
  /** Email Domain text input. Default: true */
  emailDomain?: boolean;
  /** Include Selectors textarea. Default: true */
  includeSelectors?: boolean;
  /** Exclude Selectors textarea. Default: true */
  excludeSelectors?: boolean;
  /** Field Overrides JSON textarea. Default: true */
  overrides?: boolean;
}

/**
 * Top-level visibility config for the OptionsSheet.
 *
 * Each section property accepts:
 * - `true` (default) — section visible, all fields visible
 * - `false` — entire section hidden
 * - `{ fieldA: false, fieldB: true }` — section visible, individual fields toggled
 */
export interface UiVisibilityConfig {
  /** Master toggle: enable/disable OptionsSheet entirely. Default: true */
  optionsSheet?: boolean;
  /** Provider & Mode section. Default: true */
  providerMode?: boolean | ProviderModeVisibility;
  /** Cloud Config section. Default: true */
  cloudConfig?: boolean | CloudConfigVisibility;
  /** Language section. Default: true */
  language?: boolean;
  /** Behavior section. Default: true */
  behavior?: boolean | BehaviorVisibility;
}

/**
 * Field constraints extracted from DOM elements
 */
export interface FieldConstraints {
  // Value range constraints (numeric, date, time)
  /** Minimum value for numeric/date/time fields */
  min?: number;
  /** Maximum value for numeric/date/time fields */
  max?: number;
  /** Step value for numeric/range/date/time fields */
  step?: number;

  // Text length constraints
  /** Minimum length for text fields (input, textarea) */
  minlength?: number;
  /** Maximum length for text fields (input, textarea) */
  maxlength?: number;

  // Pattern validation
  /** Pattern regex for validation (text, email, password, tel, url) */
  pattern?: string;

  // Presence constraints
  /** Whether field is required */
  required?: boolean;

  // Multiple values
  /** Allow multiple values (email, file, select) */
  multiple?: boolean;

  // File constraints
  /** Accepted MIME types or extensions (file input) */
  accept?: string;

  // State constraints
  /** Whether field is disabled */
  disabled?: boolean;
  /** Whether field is read-only */
  readonly?: boolean;

  // Select constraints
  /** Number of visible options (select) */
  size?: number;
}

/**
 * Options for value generation
 */
export interface ValueOptions {
  /** Fill mode: valid or invalid */
  mode?: FillMode;
  /** Locale for generated data */
  locale?: string;
  /** Field constraints */
  constraints?: FieldConstraints;
  /** Reference to the DOM element being filled (optional) */
  element?: HTMLElement;
  /** Semantic field type */
  fieldType?: string;
  /** Locale-specific faker instance (used by strategies to generate localized values) */
  faker?: Faker;
  /** Custom email domain for email generation (local provider only) */
  emailDomain?: string;
}

/**
 * Options for profile generation
 */
export interface ProfileOptions {
  /** Locale for generated data */
  locale?: string;
}

/**
 * Storage adapter interface for flexible storage backends
 * Implemented by classes in storage/StorageAdapter.ts
 */
export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
  size(): Promise<number>;
}

/**
 * Main FillKit configuration options
 */
export interface FillKitOptions {
  /** Default fill mode */
  mode?: FillMode;
  /** Dataset name to use */
  dataset?: string;
  /** Locale for generated data */
  locale?: string;
  /** Email domain for generated emails */
  emailDomain?: string;
  /**
   * Seed for deterministic data generation.
   *
   * When set, the local provider produces the same values on every run
   * for the same seed value. Useful for reproducible tests, screenshots,
   * and demo recordings. Must be a non-negative integer.
   * `0` is a valid seed. `undefined` means random (non-deterministic).
   * Only applies to the local provider. Ignored by cloud provider.
   */
  seed?: number | null;
  /** Enable caching */
  cache?: boolean;

  /** Data provider: local or cloud */
  provider?: 'local' | 'cloud';
  /** Provider-specific configuration */
  providerConfig?: Record<string, unknown>;
  /** Allow refilling already filled fields */
  refill?: boolean;
  /** Watch DOM for new elements and auto-fill them */
  watchMode?: boolean;
  /** UI configuration */
  ui?: {
    /** Enable UI controls */
    enabled?: boolean;
    /** Widget position (exclusive - only one position at a time) */
    position?: UiPlacement;
    /** Visibility config for OptionsSheet sections and fields */
    visibility?: UiVisibilityConfig;
    /**
     * Fill mode: `'widget'` (default toolbar) or `'inline'` (per-field icons).
     * Toggle at runtime via `Alt+I` shortcut.
     */
    fillMode?: 'widget' | 'inline';
  };
  /**
   * When using cloud provider, fall back to local generation if cloud
   * data is unavailable for a field type. Default: true
   */
  fallbackToLocal?: boolean;

  /** Default autofill configuration */
  autofill?: {
    /** Include form elements outside <form> tags */
    includeOutsideForms?: boolean;
    /** CSS selectors to include by default */
    includeSelectors?: string[];
    /** CSS selectors to exclude by default */
    excludeSelectors?: string[];
    /**
     * Default field value overrides
     *
     * Supports two formats:
     * 1. **Semantic types** (no special characters): Matches fields by their detected type
     * 2. **CSS selectors** (contains #, ., [, etc.): Matches fields by CSS selector
     *
     * Selector-based overrides take precedence over semantic type overrides.
     *
     * @example
     * ```typescript
     * overrides: {
     *   // Semantic types (applies to all fields of this type)
     *   city: "Cotonou",
     *   password: "Password@123",
     *   email: "default@example.com",
     *
     *   // CSS selectors (applies to specific fields)
     *   "#cat-email": "admin@example.com",      // By ID
     *   ".special-field": "fixed-value",        // By class
     *   "input[name='phone']": "+229123456",    // By attribute
     *   "[data-field='custom']": "value"        // By data attribute
     * }
     * ```
     */
    overrides?: Record<string, string | number | boolean | null>;
    /**
     * Minimum detection confidence to auto-fill a field (0.0–1.0).
     * Fields below this threshold are skipped and a `lowConfidence` event fires.
     * Default: 0.3
     */
    minConfidence?: number;
  };
  /** Log level for SDK output. Defaults to `'warn'`. */
  logLevel?: 'silent' | 'error' | 'warn' | 'info' | 'debug';

  /**
   * Custom token storage provider for cloud authentication.
   *
   * @remarks
   * When set, the SDK delegates token storage to this provider instead of
   * persisting the token in the cloud config localStorage atom. This allows
   * integration with HTTP-only cookies, encrypted storage, or server-side
   * token management.
   *
   * @see {@link TokenProvider}
   */
  tokenProvider?: TokenProvider;

  /**
   * CSP nonce to apply to dynamically injected `<style>` elements.
   *
   * @remarks
   * Required when the host page uses a Content Security Policy with a
   * `style-src` directive that requires nonces. The nonce is applied to
   * the `<style>` element's `nonce` attribute.
   */
  cspNonce?: string;

  /**
   * @internal Identifies instance source (page code vs browser extension).
   * Used by the extension coexistence protocol to avoid duplicate instances.
   */
  _source?: 'page' | 'extension';
}

/**
 * Options for autofill operations
 */
export interface AutofillOptions {
  /** Fill mode override */
  mode?: FillMode;
  /** Force fill even if field has user input */
  force?: boolean;
  /** Scope for autofill (element or document) */
  scope?: HTMLElement | Document;
  /** CSS selectors to include */
  includeSelectors?: string[];
  /** CSS selectors to exclude */
  excludeSelectors?: string[];
  /** Override values for specific fields */
  overrides?: Record<string, string | number | boolean | null>;
  /** Include form elements outside <form> tags */
  includeOutsideForms?: boolean;
  /** Locale for data generation */
  locale?: string;
  /**
   * Minimum detection confidence to auto-fill a field (0.0–1.0).
   * Fields below this threshold are skipped and a `lowConfidence` event fires.
   * Default: 0.3
   */
  minConfidence?: number;
}

/**
 * Dataset provider interface
 */
export interface DatasetProvider {
  /**
   * Get a value for a specific field type
   */
  getValue(
    fieldType: string,
    options?: ValueOptions
  ): Promise<string | number | boolean | null>;

  /**
   * Get a coherent profile of related fields
   */
  getProfile?(opts?: ProfileOptions): Promise<Record<string, unknown>>;

  /**
   * Initialize the provider
   */
  init?(): Promise<void>;

  /**
   * Cleanup resources
   */
  destroy?(): Promise<void>;
}

/**
 * Field mapper interface for detecting semantic types
 */
export interface FieldMapper {
  /** Mapper name for identification */
  name: string;
  /** Priority (higher = earlier in chain) */
  priority?: number;
  /** Map DOM element to semantic type */
  map(element: HTMLElement): string | null;
}

/**
 * Strategy interface for value generation
 */
export interface Strategy {
  /** Generate value for field type */
  generate(options: ValueOptions): string | number | boolean | null;
  /** Validate generated value */
  validate?(value: unknown, options: ValueOptions): boolean;
}

/**
 * Cancelable event class for event cancellation capability
 */
export class CancelableEvent {
  private _canceled = false;

  get canceled(): boolean {
    return this._canceled;
  }

  cancel(): void {
    this._canceled = true;
  }
}

/**
 * Event names for FillKit lifecycle
 */
export type FillKitEventName =
  | 'beforeScan'
  | 'afterScan'
  | 'beforeFill'
  | 'afterFill'
  | 'beforeApplyValue'
  | 'fieldFilled'
  | 'error'
  | 'lowConfidence';

/**
 * Event handler function type
 */
export type FillKitEventHandler = (
  data: unknown,
  event?: CancelableEvent
) => void | Promise<void>;

/**
 * Field filled event data
 */
export interface FieldFilledEvent {
  /**
   * The DOM element that was filled.
   * @deprecated Use descriptor instead. Direct HTMLElement references may cause
   * circular reference errors when serializing. Will be removed in v3.0.
   */
  element: HTMLElement;
  /** Framework-agnostic element descriptor (serializable, preferred) */
  descriptor: FieldElementDescriptor;
  /** Semantic type detected */
  semanticType: string;
  /** Value that was filled */
  value: string | number | boolean | null;
  /** Whether the operation had an error */
  error?: boolean;
}

/**
 * Form filled event data
 */
export interface FormFilledEvent {
  /** The form element */
  form: HTMLFormElement;
  /** Number of fields filled */
  fieldsFilled: number;
  /** List of filled fields */
  fields: FieldFilledEvent[];
}

/**
 * Base FillKit error class
 */
export class FillKitError extends Error {
  /** Error code for programmatic handling */
  code: string;
  /** Additional context */
  context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'FillKitError';
    this.code = code;
    this.context = context;
  }
}

/**
 * Network-related error
 */
export class NetworkError extends FillKitError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', context);
    this.name = 'NetworkError';
  }
}

/**
 * Validation-related error
 */
export class ValidationError extends FillKitError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
  }
}

/**
 * Provider-related error
 */
export class ProviderError extends FillKitError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'PROVIDER_ERROR', context);
    this.name = 'ProviderError';
  }
}

/**
 * DOM-related error
 */
export class DOMError extends FillKitError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'DOM_ERROR', context);
    this.name = 'DOMError';
  }
}

/**
 * Configuration error
 */
export class ConfigurationError extends FillKitError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONFIGURATION_ERROR', context);
    this.name = 'ConfigurationError';
  }
}

/**
 * Heading information
 */
export interface HeadingInfo {
  /** Heading level (1-6) */
  level: number;
  /** Heading text content */
  text: string;
}

/**
 * Field neighbor information
 */
export interface FieldNeighbor {
  /** Distance from the current field (negative for before, positive for after) */
  distance: number;
  /** Semantic type of the neighbor field, if detected */
  semanticType?: string;
  /** Name attribute of the neighbor field */
  name?: string;
}

/**
 * Framework-agnostic representation of a form field element.
 * This type can be serialized without circular reference issues,
 * making it safe for JSON.stringify, cloud API calls, and caching.
 *
 * @example
 * ```typescript
 * const descriptor: FieldElementDescriptor = {
 *   tagName: 'input',
 *   type: 'email',
 *   name: 'user_email',
 *   required: true,
 *   selector: 'form#login input[name="user_email"]'
 * };
 * ```
 */
export interface FieldElementDescriptor {
  // Identity
  /** HTML tag name: 'input', 'textarea', or 'select' */
  tagName: 'input' | 'textarea' | 'select';
  /** Name attribute value */
  name?: string;
  /** ID attribute value */
  id?: string;

  // Input specifics
  /** Input type attribute (e.g., 'text', 'email', 'number') */
  type?: string;
  /** Input mode attribute for mobile keyboards */
  inputMode?: string;

  // Display hints
  /** Placeholder text */
  placeholder?: string;
  /** ARIA label for accessibility */
  ariaLabel?: string;
  /** Autocomplete hint */
  autocomplete?: string;

  // Constraints
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field is read-only */
  readonly?: boolean;
  /** Validation pattern (regex) */
  pattern?: string;
  /** Minimum length for text inputs */
  minLength?: number;
  /** Maximum length for text inputs */
  maxLength?: number;
  /** Minimum value for number/date/time inputs */
  min?: number | string;
  /** Maximum value for number/date/time inputs */
  max?: number | string;
  /** Step value for number/range inputs */
  step?: number | string;

  // Current state
  /** Current value of the field */
  value?: string;
  /** Checked state for checkboxes/radios */
  checked?: boolean;

  // Relationships
  /** Associated label text */
  labelText?: string;
  /** Parent form ID or name */
  formId?: string;

  // Position
  /** Position index within the form */
  position?: number;

  // Selection options (for select/datalist elements)
  /** Available options for select elements */
  options?: Array<{
    /** Option value attribute */
    value: string;
    /** Option label/text */
    label: string;
    /** Whether this option is selected */
    selected?: boolean;
  }>;

  // Re-query selector
  /**
   * CSS selector to re-query this element from the DOM.
   * Generated intelligently based on id, name, form context, and position.
   */
  selector: string;
}

/**
 * Field context information
 */
export interface FieldContext {
  /**
   * The DOM element.
   * @deprecated Use descriptor instead. Direct HTMLElement references may cause
   * circular reference errors when serializing. Will be removed in v3.0.
   */
  element: HTMLElement;
  /** Framework-agnostic element descriptor (serializable, preferred) */
  descriptor: FieldElementDescriptor;
  /** Name attribute */
  name?: string;
  /** ID attribute */
  id?: string;
  /** Input type */
  type?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Associated label text */
  labelText?: string;
  /** Nearby fields (5 before and 5 after) */
  nearbyFields: FieldNeighbor[];
  /** Sibling label texts */
  siblingLabels: string[];
  /** Position in form (0-indexed) */
  positionInForm: number;
}

/**
 * Form context information
 */
export interface FormContext {
  /** Form ID or generated identifier */
  formId: string;
  /** Form action URL */
  formAction?: string;
  /** Form title (from legend or heading) */
  formTitle?: string;
  /** Legend texts within the form */
  legendTexts: string[];
  /** Field contexts */
  fields: FieldContext[];
  /** Distribution of field types */
  fieldTypeDistribution: Map<string, number>;
}

/**
 * Page context information
 */
export interface PageContext {
  /** Current page URL */
  url: string;
  /** URL pathname */
  pathname: string;
  /** Page title */
  title: string;
  /** Meta description */
  description?: string;
  /** Meta keywords */
  keywords?: string[];
  /** Page headings */
  headings: HeadingInfo[];
  /** All forms on the page */
  forms: FormContext[];
}

/**
 * Field detection result
 */
export interface FieldDetection {
  /**
   * The DOM element.
   * @deprecated Use descriptor instead. Direct HTMLElement references may cause
   * circular reference errors when serializing. Will be removed in v3.0.
   */
  element: HTMLElement;
  /** Framework-agnostic element descriptor (serializable, preferred) */
  descriptor: FieldElementDescriptor;
  /** Detected semantic type */
  semanticType: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Mapper name that detected it */
  mapper: string;
  /** Extracted constraints */
  constraints: FieldConstraints;
  /** Alternative candidates with confidence scores */
  candidates?: Array<{ type: string; confidence: number }>;
}

/**
 * Value preview result
 */
export interface ValuePreview {
  /** Generated value */
  value: string | number | boolean | null;
  /** Strategy that generated it */
  strategy: string;
  /** Fill mode used */
  mode: FillMode;
  /** Transformers applied */
  transformers: string[];
}

// ============================================================================
// Cloud Dataset Workflow Types
// ============================================================================

/**
 * Field schema for cloud dataset generation
 * Represents a single form field extracted from the page
 */
export interface FieldSchema {
  /** Field name attribute */
  name: string;
  /** Detected semantic field type (email, phone, name, etc.) */
  semanticType: string;
  /** HTML input type */
  inputType: string;
  /** Associated label text */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Aria label attribute */
  ariaLabel?: string;
  /** Field constraints from HTML attributes */
  constraints: FieldConstraints;
  /** Position within the form */
  position: number;
  /** Detection confidence score (0-1) */
  confidence?: number;
  /** Whether the field is required */
  required?: boolean;
  /** How the field was detected (sdk, manual, etc.) */
  detectedBy?: string;
  /** Field ID attribute */
  id?: string;
  /** HTML element type (input, select, textarea) */
  type?: string;
  /** Contextual information for AI analysis (cloud scanning only) */
  context?: {
    /** Nearest heading above the field */
    nearestHeading?: string;
    /** Fieldset legend if field is within a fieldset */
    fieldsetLegend?: string;
    /** Form context */
    formContext?: {
      formId?: string;
      formName?: string;
      formAction?: string;
      formMethod?: string;
    };
    /** Visual position in viewport */
    visualPosition?: {
      x: number;
      y: number;
    };
  };
}

/**
 * Form schema for cloud dataset generation
 * Represents a single form extracted from the page
 */
export interface FormSchema {
  /** Form ID attribute or generated identifier */
  formId: string;
  /** Form name attribute */
  formName?: string;
  /** Form title (from h1/h2 near form or aria-label) */
  formTitle?: string;
  /** Form action URL */
  formAction?: string;
  /** Form method (GET, POST, etc.) */
  formMethod?: string;
  /** All fields in the form */
  fields: FieldSchema[];
}

/**
 * Page metadata (for rich context)
 */
export interface PageMetadata {
  /** Page URL */
  url: string;
  /** Page title */
  title: string;
  /** Domain name */
  domain: string;
  /** Meta description */
  description?: string;
  /** Open Graph description */
  ogDescription?: string;
  /** All headings on page (by level) */
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
    h4: string[];
    h5: string[];
    h6: string[];
  };
}

/**
 * Page schema for cloud dataset generation
 * Complete structure of all forms on a page
 */
export interface PageSchema {
  /** Page metadata */
  metadata: PageMetadata;
  /** All forms on the page */
  forms: FormSchema[];
  /** Extraction timestamp (optional, for backwards compatibility) */
  timestamp?: number;
}

/**
 * Options for schema extraction
 */
export interface SchemaExtractionOptions {
  /** Scope to extract from (default: document) */
  scope?: HTMLElement | Document;
  /** CSS selectors to include */
  includeSelectors?: string[];
  /** CSS selectors to exclude */
  excludeSelectors?: string[];
}

/**
 * Cloud dataset structure
 * Downloaded from cloud and cached locally
 * Supports cross-page data reuse via semantic field types
 */
export interface CloudDataset {
  /** Dataset ID */
  id: string;
  /** Project ID */
  projectId: string;
  /** Dataset version */
  version: string;
  /** Generation timestamp */
  generatedAt: number;
  /** Expiration timestamp */
  expiresAt: number;
  /** Locale used for generation */
  locale?: string;
  /** Industry context */
  industry?: string;

  /** Source page information (for reference, but data is reusable across pages) */
  sourcePages: Array<{
    url: string;
    title: string;
    scannedAt: number;
  }>;

  /** Field data organized by semantic type (reusable across all pages) */
  data: {
    [semanticType: string]: Array<string | number | boolean>;
  };

  /** Coherent user profiles (optional) */
  profiles?: Array<{
    [fieldType: string]: unknown;
  }>;
}

/**
 * Merged dataset cache
 * Combines data from multiple datasets for a project
 */
export interface MergedDatasetCache {
  /** Project ID */
  projectId: string;
  /** Last update timestamp */
  lastUpdated: number;
  /** All datasets IDs included */
  datasetIds: string[];
  /** Merged field data from all datasets */
  data: {
    [semanticType: string]: Array<string | number | boolean>;
  };
  /** Data organized by dataset ID for automatic page routing */
  dataByDataset: {
    [datasetId: string]: {
      /** Field data for this specific dataset */
      data: {
        [semanticType: string]: Array<string | number | boolean>;
      };
      /** Source pages this dataset was captured from */
      sourcePages: Array<{
        url: string;
        title: string;
        scannedAt: number;
      }>;
    };
  };
  /** Source pages across all datasets */
  sourcePages: Array<{
    url: string;
    title: string;
    scannedAt: number;
    datasetId: string;
  }>;
}

/**
 * Dataset sync status information
 */
export interface DatasetSyncStatus {
  /** Last successful sync timestamp (null if never synced) */
  lastSync: number | null;
  /** Current dataset version (null if not available) */
  version: string | null;
  /** Number of records in cached dataset */
  recordCount: number;
  /** Whether cache is stale and needs refresh */
  isStale: boolean;
  /** Next scheduled sync timestamp (null for manual mode) */
  nextSync: number | null;
}

/**
 * Schema upload result from cloud
 */
export interface SchemaUploadResult {
  /** Generated schema ID */
  schemaId: string;
  /** Associated dataset ID */
  datasetId: string;
  /** Processing status */
  status: 'pending' | 'processing' | 'ready' | 'failed';
  /** Estimated completion time in ms (for pending/processing) */
  estimatedCompletionTime?: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Dataset sync result
 */
export interface DatasetSyncResult {
  /** Whether sync was successful */
  synced: boolean;
  /** Dataset version synced */
  version: string;
  /** Number of records synced */
  recordCount: number;
  /** Sync timestamp */
  timestamp: number;
}

/**
 * Cloud credentials validation result
 */
export interface CloudCredentialsValidation {
  /** Whether credentials are valid */
  valid: boolean;
  /** Project ID */
  projectId?: string;
  /** Project name */
  projectName?: string;
  /** Token expiration timestamp */
  tokenExpiresAt?: number;
  /** Error message if invalid */
  error?: string;
  /** Reason code if invalid */
  errorCode?:
    | 'INVALID_TOKEN'
    | 'INVALID_PROJECT'
    | 'EXPIRED_TOKEN'
    | 'NETWORK_ERROR';
}

// ============================================================================
// Project Management Types
// ============================================================================

/**
 * FillKit Cloud project
 */
export interface CloudProject {
  /** Project ID */
  id: string;
  /** Project name */
  name: string;
  /** Creation timestamp */
  createdAt: number;
  /** Last updated timestamp */
  updatedAt: number;
}

/**
 * Project list response
 */
export interface ProjectListResponse {
  /** List of projects */
  projects: CloudProject[];
  /** Total count */
  total: number;
  /** Pagination offset */
  offset: number;
  /** Pagination limit */
  limit: number;
}

// ============================================================================
// Dataset Management Types
// ============================================================================

/**
 * Dataset metadata
 */
export interface DatasetMetadata {
  /** Dataset ID */
  id: string;
  /** Associated project ID */
  projectId: string;
  /** Dataset name */
  name: string;
  /** Dataset version */
  version: string;
  /** Generation status */
  status: 'pending' | 'processing' | 'ready' | 'failed' | 'expired';
  /** Creation timestamp */
  createdAt: number;
  /** Generation completion timestamp */
  completedAt?: number;
  /** Expiration timestamp */
  expiresAt: number;
  /** Source schema ID */
  schemaId?: string;
  /** Record count */
  recordCount: number;
  /** Dataset size in bytes */
  size: number;
  /** Generation settings */
  settings: {
    locale?: string;
    industry?: string;
    recordsPerField?: number;
  };
}

/**
 * Dataset list response
 */
export interface DatasetListResponse {
  /** List of datasets */
  datasets: DatasetMetadata[];
  /** Total count */
  total: number;
  /** Pagination offset */
  offset: number;
  /** Pagination limit */
  limit: number;
}
