/**
 * SDK configuration state management for FillKit core options.
 *
 * @remarks
 * Manages all core FillKit configuration options including fill behavior,
 * provider selection, locale settings, and field filtering. All options are
 * persisted to localStorage and synchronized across browser tabs.
 *
 * **Key Features:**
 * - Fill mode control (valid/invalid data)
 * - Provider selection (local/cloud)
 * - Locale configuration for data generation
 * - Watch mode for automatic form filling
 * - Field inclusion/exclusion filters
 * - Custom field overrides
 *
 * **Storage:**
 * - Key: `fillkit:sdk-options`
 * - Location: localStorage
 * - Format: JSON
 *
 * @example
 * Basic configuration:
 * ```ts
 * import { sdkOptions } from './atoms/sdk-options';
 *
 * // Configure for cloud provider with French locale
 * sdkOptions.set({
 *   ...sdkOptions.get(),
 *   provider: 'cloud',
 *   locale: 'fr',
 *   mode: 'valid'
 * });
 *
 * // Enable watch mode for automatic filling
 * sdkOptions.set({
 *   ...sdkOptions.get(),
 *   watchMode: true
 * });
 * ```
 */

import { persistentAtom } from '@nanostores/persistent';
import type { FillMode } from '../../types/index.js';
import { safeJsonParse } from '../../utils/sanitize.js';

/**
 * SDK configuration options structure.
 *
 * @remarks
 * Defines all configurable options for FillKit SDK behavior. These options
 * control how forms are detected, filled, and what data is generated.
 */
export interface SdkOptionsState {
  /**
   * Fill mode for data generation.
   *
   * @remarks
   * - `valid`: Generates data that passes field validation
   * - `invalid`: Generates intentionally invalid data for testing
   */
  mode: FillMode;

  /**
   * Data provider type.
   *
   * @remarks
   * - `local`: Offline generation using Faker.js
   * - `cloud`: Cloud-based datasets from FillKit API
   */
  provider: 'local' | 'cloud';

  /**
   * Locale for data generation.
   *
   * @remarks
   * BCP 47 language code (e.g., 'en', 'fr', 'es', 'de').
   * Affects generated names, addresses, and other locale-specific data.
   */
  locale: string;

  /**
   * Whether to refill fields that already have values.
   *
   * @remarks
   * When true, all fields are filled regardless of existing values.
   * When false, only empty fields are filled.
   */
  refill: boolean;

  /**
   * Automatic form filling mode.
   *
   * @remarks
   * When enabled, automatically fills new fields as they appear in the DOM.
   * Useful for multi-step forms and dynamically loaded content.
   */
  watchMode: boolean;

  /**
   * Include fields outside form elements.
   *
   * @remarks
   * When true, detects and fills input fields even if they're not
   * inside a `<form>` element. Useful for modern SPAs.
   */
  includeOutsideForms: boolean;

  /**
   * Additional CSS selectors to include in autofill.
   *
   * @remarks
   * Array of CSS selectors for fields that should be included
   * even if they don't match standard detection patterns.
   */
  includeSelectors: string[];

  /**
   * CSS selectors to exclude from autofill.
   *
   * @remarks
   * Array of CSS selectors for fields that should never be filled.
   * Useful for excluding search boxes, filters, etc.
   */
  excludeSelectors: string[];

  /**
   * Email domain for generated addresses.
   *
   * @remarks
   * Only applies to local provider. Generated email addresses will
   * use this domain (e.g., 'user@example.com').
   */
  emailDomain: string;

  /**
   * Custom values for specific fields.
   *
   * @remarks
   * Map of field names/IDs to custom values. Overrides generated values
   * for matching fields. Useful for setting specific test data.
   */
  overrides: Record<string, string | number | boolean | null>;
}

/**
 * Default SDK options
 */
export const defaultSdkOptions: SdkOptionsState = {
  mode: 'valid',
  provider: 'local',
  locale: 'en',
  refill: true,
  watchMode: true,
  includeOutsideForms: false,
  includeSelectors: [],
  excludeSelectors: [],
  emailDomain: 'fillkit.dev',
  overrides: {},
};

/**
 * Persistent atom for SDK configuration options.
 *
 * @remarks
 * This atom automatically persists to localStorage and restores on page load.
 * Changes are synchronized across all browser tabs. Use this as the single
 * source of truth for SDK configuration.
 *
 * **Persistence:**
 * - Storage key: `fillkit:sdk-options`
 * - Encoding: JSON.stringify
 * - Decoding: JSON.parse
 *
 * **State Management:**
 * - Read: `sdkOptions.get()`
 * - Write: `sdkOptions.set(newState)`
 * - Subscribe: `sdkOptions.subscribe(callback)`
 *
 * @example
 * Basic configuration:
 * ```ts
 * import { sdkOptions } from './atoms/sdk-options';
 *
 * // Switch to cloud provider
 * sdkOptions.set({ ...sdkOptions.get(), provider: 'cloud' });
 *
 * // Change locale to French
 * sdkOptions.set({ ...sdkOptions.get(), locale: 'fr' });
 *
 * // Enable watch mode
 * sdkOptions.set({ ...sdkOptions.get(), watchMode: true });
 * ```
 *
 * @example
 * Custom field overrides:
 * ```ts
 * import { sdkOptions } from './atoms/sdk-options';
 *
 * // Set specific values for certain fields
 * sdkOptions.set({
 *   ...sdkOptions.get(),
 *   overrides: {
 *     email: 'test@example.com',
 *     username: 'testuser123',
 *     age: 25
 *   }
 * });
 * ```
 */
export const sdkOptions = persistentAtom<SdkOptionsState>(
  'fillkit:sdk-options',
  defaultSdkOptions,
  {
    encode: JSON.stringify,
    decode: (raw: string) => safeJsonParse(raw, defaultSdkOptions),
  }
);
