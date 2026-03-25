/**
 * Storage constants for caching infrastructure.
 *
 * @remarks
 * Defines constants and types used by the caching layer (SchemaCache, DatasetCache).
 * These are separate from SDK state management, which uses nanostores atoms in
 * `src/state/atoms/`.
 *
 * **Important Distinction:**
 * - **State Atoms** (`src/state/atoms/`): SDK configuration and runtime state
 * - **Cache Storage** (this file): Temporary caching of scanned schemas and datasets
 *
 * The caching layer is designed to be ephemeral and can be cleared without affecting
 * SDK functionality, whereas state atoms contain critical configuration.
 *
 * @example
 * Usage in caching systems:
 * ```ts
 * import { STORAGE_KEYS, SchemaCacheEntry } from './storage-constants';
 *
 * // Use constants for consistent key naming
 * const cacheKey = `${STORAGE_KEYS.SCHEMA_CACHE_PREFIX}${url}`;
 *
 * // Type-safe cache entries
 * const entry: SchemaCacheEntry = {
 *   url: 'https://example.com',
 *   fieldTypes: ['email', 'password'],
 *   timestamp: Date.now(),
 *   version: '1.0'
 * };
 * ```
 */

/**
 * Storage key constants for caching systems.
 *
 * @remarks
 * Centralized storage keys to ensure consistency across the caching layer.
 * These keys are separate from state atom keys to avoid conflicts.
 */
export const STORAGE_KEYS = {
  /**
   * IndexedDB database name for cloud datasets.
   *
   * @remarks
   * Used by DatasetCache for storing large cloud-generated datasets.
   */
  CLOUD_DB: 'fillkit-cloud-db',

  /**
   * Prefix for schema cache entries in localStorage.
   *
   * @remarks
   * Used by SchemaCache to namespace cached page schemas.
   * Separate from state atoms to allow independent cache clearing.
   */
  SCHEMA_CACHE_PREFIX: 'fillkit-schema-cache:',

  /**
   * Key for schema cache metadata.
   *
   * @remarks
   * Stores aggregate statistics about cached schemas.
   */
  SCHEMA_CACHE_METADATA: 'fillkit-schema-cache-metadata',
} as const;

/**
 * Schema cache entry structure.
 *
 * @remarks
 * Represents a single cached page schema. Used by SchemaCache to store
 * detected field types for scanned pages.
 */
export interface SchemaCacheEntry {
  /**
   * URL that was scanned.
   *
   * @remarks
   * Normalized URL without query parameters or hash fragments.
   */
  url: string;

  /**
   * Detected semantic field types.
   *
   * @remarks
   * Array of field type identifiers (e.g., 'email', 'password', 'name').
   */
  fieldTypes: string[];

  /**
   * Timestamp when the page was scanned.
   *
   * @remarks
   * Unix timestamp in milliseconds. Used for cache expiration.
   */
  timestamp: number;

  /**
   * Cache format version.
   *
   * @remarks
   * Allows for cache invalidation when the schema format changes.
   */
  version: string;
}

/**
 * Schema cache metadata structure.
 *
 * @remarks
 * Tracks aggregate statistics about the schema cache for monitoring
 * and maintenance purposes.
 */
export interface SchemaCacheMetadata {
  /**
   * Total number of cached URLs.
   *
   * @remarks
   * Count of unique URLs with cached schemas.
   */
  totalUrls: number;

  /**
   * Last cleanup timestamp.
   *
   * @remarks
   * Unix timestamp of the last cache cleanup operation.
   * Used to schedule periodic maintenance.
   */
  lastCleanup: number;

  /**
   * Cache format version.
   *
   * @remarks
   * Version of the metadata format. Allows for metadata migration.
   */
  version: string;
}

/**
 * Current schema cache format version.
 *
 * @remarks
 * Increment this version when making breaking changes to the cache format.
 * Allows for automatic cache invalidation when the format changes.
 */
export const SCHEMA_CACHE_VERSION = '1.0';
