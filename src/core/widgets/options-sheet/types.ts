/**
 * Shared type definitions for OptionsSheet components.
 *
 * @remarks
 * Contains interfaces for events, configuration options, statistics, and component props
 * used throughout the options sheet implementation.
 */

/**
 * All possible value types that can be set via option change callbacks.
 *
 * @remarks
 * Covers mode ('valid'/'invalid'), provider ('local'/'cloud'), locale (string),
 * boolean toggles, selector arrays, and override objects.
 */
export type OptionChangeValue =
  | string
  | boolean
  | string[]
  | Record<string, unknown>;

/**
 * Callback signature for option change handlers.
 */
export type OptionChangeHandler = (
  field: string,
  value: OptionChangeValue
) => void;

/**
 * Represents a change event for a configuration option.
 */
export interface OptionChangeEvent {
  /** The name of the field that changed. */
  field: string;
  /** The new value of the field. */
  value: OptionChangeValue;
}

/**
 * Configuration options for autofill behavior.
 */
export interface BehaviorOptions {
  /** Whether to overwrite existing values in fields. */
  refill?: boolean;
  /** Whether to watch for and autofill new fields dynamically added to the DOM. */
  watchMode?: boolean;
  /** Whether to include input fields that are not contained within a form element. */
  includeOutsideForms?: boolean;
  /** The domain to use for generating email addresses (local provider only). */
  emailDomain?: string;
  /** CSS selectors for fields to explicitly include in autofill. */
  includeSelectors?: string[];
  /** CSS selectors for fields to explicitly exclude from autofill. */
  excludeSelectors?: string[];
  /** Custom values to override specific fields, keyed by field name or ID. */
  overrides?: Record<string, unknown>;
}

/**
 * Statistics regarding the data provider's performance and coverage.
 */
export interface ProviderStats {
  /** The current operational status of the provider. */
  status: 'local' | 'cloud' | 'cloud-degraded';
  /** The number of fields filled using cloud data. */
  cloudFills: number;
  /** The number of fields filled using locally generated data. */
  localFills: number;
  /** The set of field types available for autofill. */
  availableTypes: Set<string>;
  /** The set of field types that were requested but missing. */
  missingTypes: Set<string>;
}

/**
 * Status information about the current dataset.
 */
export interface DatasetStats {
  /** The version identifier of the dataset. */
  version: string;
  /** The timestamp of the last successful synchronization, or null if never synced. */
  lastSync: number | null;
}

/**
 * Base properties shared by all configuration sections.
 */
export interface SectionProps {
  /** The current configuration values for the section. */
  currentOptions?: Record<string, unknown>;
  /** Callback function triggered when a configuration value changes. */
  onChange?: OptionChangeHandler;
}
