/**
 * FillKit SDK - Public API
 *
 * Main entry point for the FillKit SDK.
 * Exports only the public-facing APIs needed by users.
 */

// Main SDK class
import { FillKit } from './core/FillKit.js';

export { FillKit };
export type { FillKitInstanceMarker } from './core/FillKit.js';

// Core types for FillKit configuration
export type {
  FillMode,
  UiPlacement,
  FillKitOptions,
  AutofillOptions,
  FieldConstraints,
  ValueOptions,
  ProfileOptions,
  UiVisibilityConfig,
  ProviderModeVisibility,
  CloudConfigVisibility,
  BehaviorVisibility,
} from './types/index.js';

// Event system
export type {
  FillKitEventName,
  FillKitEventHandler,
  FieldFilledEvent,
  FormFilledEvent,
} from './types/index.js';
export { CancelableEvent } from './types/index.js';

// Error classes
export {
  FillKitError,
  NetworkError,
  ValidationError,
  ProviderError,
  DOMError,
  ConfigurationError,
} from './types/index.js';

// Semantic field types (for custom field type detection)
// cspell:ignore Validatable
export {
  SemanticFieldType,
  FieldCategory,
  FIELD_TYPE_REGISTRY,
  getFieldTypeMetadata,
  getFieldTypesByCategory,
  getValidatableFieldTypes,
  supportsValidation,
  getDefaultConstraints,
} from './types/semantic-fields.js';

// Provider configuration types
export type { LocalProviderConfig } from './providers/LocalProvider.js';
export type { CloudProviderConfig } from './providers/CloudProvider.js';

// Cloud-related types
export type {
  PageSchema,
  FormSchema,
  FieldSchema,
  CloudDataset,
} from './types/index.js';

export type { ScanOptions, ScanResult, ScanSummary } from './types/cloud.js';

// Context types (for advanced usage)
export type {
  PageContext,
  FormContext,
  FieldContext,
  FieldDetection,
  FieldElementDescriptor,
} from './types/index.js';

// Logger (for advanced usage — controlling SDK log output)
export { Logger, logger } from './core/Logger.js';
export type { LogLevel } from './core/Logger.js';

// Utility classes (for advanced usage)
export { ElementSelector } from './utils/ElementSelector.js';

// Feedback system (for accessing errors and notifications)
export { FeedbackManager } from './core/FeedbackManager.js';
export type {
  FeedbackType,
  FeedbackScope,
  FeedbackMessage,
  FeedbackOptions,
  FeedbackManagerOptions,
  FeedbackProgress,
  FeedbackAction,
} from './core/FeedbackManager.js';

// Pluggable token storage
export type { TokenProvider } from './types/token-provider.js';

// Enums (exported as both type and value)
export {} from './types/index.js';
