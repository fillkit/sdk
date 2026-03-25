/**
 * FillKit state management atoms.
 *
 * @remarks
 * Centralized state management using nanostores for reactive, type-safe state.
 * All SDK configuration and runtime state flows through these atoms, providing
 * a single source of truth for the entire application.
 *
 * **Architecture:**
 * - **Persistent Atoms**: Automatically saved to localStorage/IndexedDB
 * - **Ephemeral Atoms**: Runtime-only, reset on page reload
 * - **Reactive**: Subscribe to changes for automatic UI updates
 * - **Type-Safe**: Full TypeScript support with interfaces
 *
 * **Atom Categories:**
 *
 * 1. **SDK Options** (`sdkOptions`)
 *    - Core configuration (mode, provider, locale)
 *    - Field filtering and overrides
 *    - Persisted to localStorage
 *
 * 2. **Cloud Config** (`cloudConfig`)
 *    - CloudProvider credentials and authentication
 *    - Project selection and management
 *    - Persisted to localStorage
 *
 * 3. **Cloud Datasets** (`cloudDatasets`)
 *    - Cached datasets from CloudProvider
 *    - Large dataset storage (10MB+)
 *    - Persisted to IndexedDB
 *
 * 4. **UI Config** (`uiConfig`)
 *    - Widget visibility and positioning
 *    - Theme configuration
 *    - Persisted to localStorage
 *
 * 5. **Widget State** (`widgetState`)
 *    - Ephemeral UI state (sheets, visibility)
 *    - NOT persisted (resets on reload)
 *
 * @example
 * Basic usage:
 * ```ts
 * import { sdkOptions, cloudConfig, widgetState } from './state/atoms';
 *
 * // Read state
 * const options = sdkOptions.get();
 * console.log('Current provider:', options.provider);
 *
 * // Update state
 * sdkOptions.set({ ...sdkOptions.get(), locale: 'fr' });
 *
 * // Subscribe to changes
 * const unsubscribe = sdkOptions.subscribe((opts) => {
 *   console.log('Options changed:', opts);
 * });
 * ```
 *
 * @example
 * Reactive UI with multiple atoms:
 * ```ts
 * import { sdkOptions, cloudConfig, uiConfig } from './state/atoms';
 *
 * // Subscribe to multiple atoms
 * const unsubscribeOptions = sdkOptions.subscribe(updateOptionsUI);
 * const unsubscribeCloud = cloudConfig.subscribe(updateAuthUI);
 * const unsubscribeUI = uiConfig.subscribe(updateWidgetPosition);
 *
 * // Clean up all subscriptions
 * function cleanup() {
 *   unsubscribeOptions();
 *   unsubscribeCloud();
 *   unsubscribeUI();
 * }
 * ```
 */

// SDK Options (localStorage)
export {
  sdkOptions,
  defaultSdkOptions,
  type SdkOptionsState,
} from './sdk-options.js';

// Cloud Config (localStorage)
export {
  cloudConfig,
  defaultCloudConfig,
  setTokenProvider,
  getActiveTokenProvider,
  getTokenFromProvider,
  type CloudConfigState,
  type CloudProject,
} from './cloud-config.js';

// UI Config (localStorage)
export {
  uiConfig,
  defaultUiConfig,
  defaultVisibility,
  resolveVisibility,
  unresolveVisibility,
  enforceVisibilityConstraints,
  type UiConfigState,
  type WidgetPosition,
  type ResolvedUiVisibility,
} from './ui-config.js';

// Cloud Datasets (IndexedDB)
export {
  cloudDatasets,
  defaultCloudDatasets,
  type CloudDatasetsState,
  type DatasetEntry,
} from './cloud-datasets.js';

// Widget State (ephemeral, not persisted)
export {
  widgetState,
  defaultWidgetState,
  type WidgetState,
} from './widget-state.js';
