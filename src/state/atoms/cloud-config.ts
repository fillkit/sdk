/**
 * Cloud configuration state management for FillKit Cloud integration.
 *
 * @remarks
 * Manages CloudProvider credentials, project selection, and authentication state
 * using nanostores persistent atoms. All configuration is automatically persisted
 * to localStorage and synchronized across browser tabs.
 *
 * **Key Features:**
 * - API token storage (fk_live_xxx or fk_test_xxx)
 * - Project selection and management
 * - Available projects list caching
 * - Optional dataset selection
 * - Automatic localStorage persistence
 * - Pluggable token storage via {@link TokenProvider}
 *
 * **Storage:**
 * - Key: `fillkit:cloud-config`
 * - Location: localStorage
 * - Format: JSON
 *
 * @example
 * Basic authentication flow:
 * ```ts
 * import { cloudConfig } from './atoms/cloud-config';
 *
 * // Set credentials after login
 * cloudConfig.set({
 *   token: 'fk_live_abc123',
 *   projectId: 'proj_xyz',
 *   projects: [{ id: 'proj_xyz', name: 'My Project', createdAt: Date.now(), updatedAt: Date.now() }],
 *   dataset: null,
 *   savedAt: Date.now()
 * });
 *
 * // Check authentication status
 * const isAuthenticated = () => {
 *   const cfg = cloudConfig.get();
 *   return !!(cfg.token && cfg.projectId);
 * };
 *
 * // Clear credentials on logout
 * cloudConfig.set({
 *   token: null,
 *   projectId: null,
 *   projects: [],
 *   dataset: null
 * });
 * ```
 */

import { persistentAtom } from '@nanostores/persistent';
import type { CloudProject as CloudProjectType } from '../../types/index.js';
import type { TokenProvider } from '../../types/token-provider.js';
import { safeJsonParse } from '../../utils/sanitize.js';

/**
 * Cloud project metadata (re-exported from types)
 */
export type CloudProject = CloudProjectType;

/**
 * Cloud configuration state structure.
 *
 * @remarks
 * Stores all necessary information for CloudProvider authentication and operation.
 * This state is persisted to localStorage and restored on page load.
 */
export interface CloudConfigState {
  /**
   * API authentication token.
   *
   * @remarks
   * Format: `fk_live_xxx` for production or `fk_test_xxx` for testing.
   * Obtained from FillKit Cloud dashboard. Required for all cloud operations.
   *
   * When a {@link TokenProvider} is active, this field is stripped from
   * localStorage persistence and the token is resolved via the provider.
   */
  token: string | null;

  /**
   * Currently selected project ID.
   *
   * @remarks
   * Format: `proj_xxx`. Must correspond to one of the projects in the `projects` array.
   * Required for dataset operations.
   */
  projectId: string | null;

  /**
   * List of available projects for the authenticated token.
   *
   * @remarks
   * Cached from the last successful API call to avoid repeated fetches.
   * Updated when credentials change or projects are refreshed.
   */
  projects: CloudProject[];

  /**
   * Optional dataset name to use for form filling.
   *
   * @remarks
   * If null, uses the project's default dataset. Allows switching between
   * multiple datasets within the same project.
   */
  dataset: string | null;

  /**
   * Timestamp of last successful configuration save.
   *
   * @remarks
   * Used for debugging and cache invalidation. Updated automatically
   * whenever the configuration changes.
   */
  savedAt?: number;
}

/**
 * Default cloud config (no credentials)
 */
export const defaultCloudConfig: CloudConfigState = {
  token: null,
  projectId: null,
  projects: [],
  dataset: null,
  savedAt: undefined,
};

// ---------------------------------------------------------------------------
// TokenProvider support
// ---------------------------------------------------------------------------

/**
 * Module-level active token provider.
 * When set, the token is resolved from this provider instead of the atom.
 */
let activeTokenProvider: TokenProvider | null = null;

/**
 * Registers a custom token provider for cloud authentication.
 *
 * @remarks
 * When a provider is set, the persistent atom's `encode` function strips
 * the `token` field before writing to localStorage, preventing the token
 * from being persisted in plain text. Token retrieval is delegated to the
 * provider via {@link getTokenFromProvider}.
 *
 * @param provider - The token provider to use, or `null` to clear.
 */
export function setTokenProvider(provider: TokenProvider | null): void {
  activeTokenProvider = provider;
}

/**
 * Returns the currently active token provider, if any.
 *
 * @returns The active provider or `null`.
 */
export function getActiveTokenProvider(): TokenProvider | null {
  return activeTokenProvider;
}

/**
 * Resolves the current authentication token.
 *
 * @remarks
 * If a {@link TokenProvider} is active, the token is resolved from the provider.
 * Otherwise, the token is read from the cloud config atom.
 *
 * @returns The token string, or `null` if unavailable.
 */
export async function getTokenFromProvider(): Promise<string | null> {
  if (activeTokenProvider) {
    return activeTokenProvider.getToken();
  }
  return cloudConfig.get().token;
}

// ---------------------------------------------------------------------------
// Persistent atom
// ---------------------------------------------------------------------------

/**
 * Persistent atom for cloud configuration state.
 *
 * @remarks
 * This atom automatically persists to localStorage and restores on page load.
 * Changes are synchronized across all browser tabs. Use this as the single
 * source of truth for CloudProvider authentication and configuration.
 *
 * When a {@link TokenProvider} is active, the `token` field is stripped
 * from the encoded JSON before writing to localStorage.
 *
 * **Persistence:**
 * - Storage key: `fillkit:cloud-config`
 * - Encoding: JSON.stringify (token omitted when provider is active)
 * - Decoding: JSON.parse
 *
 * **State Management:**
 * - Read: `cloudConfig.get()`
 * - Write: `cloudConfig.set(newState)`
 * - Subscribe: `cloudConfig.subscribe(callback)`
 */
export const cloudConfig = persistentAtom<CloudConfigState>(
  'fillkit:cloud-config',
  defaultCloudConfig,
  {
    encode(value: CloudConfigState): string {
      // Strip token from localStorage when a TokenProvider is active
      if (activeTokenProvider) {
        return JSON.stringify({ ...value, token: null });
      }
      return JSON.stringify(value);
    },
    decode: (raw: string) => safeJsonParse(raw, defaultCloudConfig),
  }
);
