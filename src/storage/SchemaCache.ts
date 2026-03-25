/**
 * Storage adapter-based cache for scanned page schemas.
 *
 * @remarks
 * Provides flexible schema caching using pluggable storage adapters. Supports
 * localStorage, sessionStorage, IndexedDB, or custom adapters. Automatically
 * tracks cache metadata and provides utilities for cache management.
 *
 * **Key Features:**
 * - Pluggable storage backend (localStorage, sessionStorage, memory, IndexedDB)
 * - URL normalization for consistent caching
 * - Automatic metadata tracking
 * - Cache size calculation
 * - Flexible enable/disable control
 *
 * **Storage Structure:**
 * - Key format: `schema:{normalized-url}`
 * - Metadata key: `schema:metadata`
 * - Default adapter: LocalStorageAdapter
 *
 * @example
 * Basic usage with localStorage:
 * ```ts
 * import { SchemaCache } from './SchemaCache';
 * import { LocalStorageAdapter } from './StorageAdapter';
 *
 * const cache = new SchemaCache(new LocalStorageAdapter());
 *
 * // Store a schema
 * await cache.store('https://example.com/form', {
 *   forms: [...],
 *   fields: [...]
 * });
 *
 * // Retrieve a schema
 * const cached = await cache.get('https://example.com/form');
 * if (cached) {
 *   console.log('Schema cached at:', new Date(cached.cachedAt));
 * }
 * ```
 */

import type { PageSchema } from '../types/index.js';
import { logger } from '@/core/Logger.js';
import type { CachedSchema } from '../types/cloud.js';
import type { StorageAdapter } from '../types/index.js';
import { LocalStorageAdapter } from './StorageAdapter.js';

const CACHE_PREFIX = 'schema:';
const METADATA_KEY = 'schema:metadata';

/**
 * Cache metadata structure.
 *
 * @remarks
 * Tracks aggregate statistics about all cached schemas for monitoring
 * and cache management purposes.
 */
interface SchemaCacheMetadata {
  /** Total number of cached schemas */
  totalSchemas: number;
  /** Total number of fields across all schemas */
  totalFields: number;
  /** Total number of forms across all schemas */
  totalForms: number;
  /** Timestamp of last metadata update */
  lastUpdated: number;
}

/**
 * Cache manager for page schemas with pluggable storage adapters.
 *
 * @remarks
 * Provides a flexible caching layer for scanned page schemas. Supports
 * multiple storage backends through the StorageAdapter interface.
 */
export class SchemaCache {
  private adapter: StorageAdapter;
  private enabled: boolean;

  /**
   * Creates a new SchemaCache instance.
   *
   * @param adapter - Storage adapter to use (defaults to LocalStorageAdapter)
   * @param enabled - Whether caching is enabled (defaults to true)
   *
   * @example
   * ```ts
   * // Use localStorage (default)
   * const cache = new SchemaCache();
   *
   * // Use sessionStorage
   * const cache = new SchemaCache(new SessionStorageAdapter());
   *
   * // Use memory (for testing)
   * const cache = new SchemaCache(new MemoryAdapter());
   * ```
   */
  constructor(adapter?: StorageAdapter, enabled: boolean = true) {
    this.adapter = adapter || new LocalStorageAdapter();
    this.enabled = enabled;
  }

  /**
   * Stores a schema in cache.
   *
   * @remarks
   * Automatically adds a timestamp and updates cache metadata.
   * URL is normalized before caching to ensure consistency.
   *
   * @param url - Page URL
   * @param schema - Extracted page schema
   *
   * @throws Error if storage operation fails
   *
   * @example
   * ```ts
   * await cache.store('https://example.com/signup', {
   *   forms: [{ fields: [...] }]
   * });
   * ```
   */
  async store(url: string, schema: PageSchema): Promise<void> {
    if (!this.enabled) return;

    try {
      const cacheKey = this.getCacheKey(url);
      const cached: CachedSchema = {
        url,
        cachedAt: Date.now(),
        schema,
      };

      await this.adapter.set(cacheKey, cached);
      await this.updateMetadata();
    } catch (error) {
      logger.error('SchemaCache: Failed to store schema', error);
      throw new Error(`Failed to store schema for ${url}`);
    }
  }

  /**
   * Retrieves a schema from cache.
   *
   * @param url - Page URL
   *
   * @returns Cached schema or null if not found
   *
   * @example
   * ```ts
   * const cached = await cache.get('https://example.com/signup');
   * if (cached) {
   *   console.log('Found schema with', cached.schema.forms.length, 'forms');
   *   console.log('Cached', Date.now() - cached.cachedAt, 'ms ago');
   * }
   * ```
   */
  async get(url: string): Promise<CachedSchema | null> {
    if (!this.enabled) return null;

    try {
      const cacheKey = this.getCacheKey(url);
      const cached = await this.adapter.get<CachedSchema>(cacheKey);

      return cached;
    } catch (error) {
      logger.error('SchemaCache: Failed to get schema', error);
      return null;
    }
  }

  /**
   * Retrieves all cached schemas.
   *
   * @remarks
   * Results are sorted by cache time (most recent first).
   *
   * @returns Array of all cached schemas
   *
   * @example
   * ```ts
   * const schemas = await cache.getAll();
   * schemas.forEach(cached => {
   *   console.log(`${cached.url}: ${cached.schema.forms.length} forms`);
   * });
   * ```
   */
  async getAll(): Promise<CachedSchema[]> {
    if (!this.enabled) return [];

    const schemas: CachedSchema[] = [];

    try {
      const keys = await this.adapter.keys();

      for (const key of keys) {
        if (key.startsWith(CACHE_PREFIX) && key !== METADATA_KEY) {
          const value = await this.adapter.get<CachedSchema>(key);
          if (value) {
            schemas.push(value);
          }
        }
      }

      // Sort by cached time (most recent first)
      schemas.sort((a, b) => b.cachedAt - a.cachedAt);

      return schemas;
    } catch (error) {
      logger.error('SchemaCache: Failed to get all schemas', error);
      return [];
    }
  }

  /**
   * Removes a schema from cache.
   *
   * @remarks
   * Also updates cache metadata after removal.
   *
   * @param url - Page URL
   *
   * @example
   * ```ts
   * await cache.remove('https://example.com/old-form');
   * ```
   */
  async remove(url: string): Promise<void> {
    if (!this.enabled) return;

    try {
      const cacheKey = this.getCacheKey(url);
      await this.adapter.remove(cacheKey);
      await this.updateMetadata();
    } catch (error) {
      logger.error('SchemaCache: Failed to remove schema', error);
    }
  }

  /**
   * Clears all cached schemas.
   *
   * @remarks
   * Removes all schema entries and metadata. This operation cannot be undone.
   *
   * @example
   * ```ts
   * await cache.clear();
   * console.log('All schemas cleared');
   * ```
   */
  async clear(): Promise<void> {
    if (!this.enabled) return;

    try {
      const keys = await this.adapter.keys();
      const schemaKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));

      // Remove all schema keys
      for (const key of schemaKeys) {
        await this.adapter.remove(key);
      }
    } catch (error) {
      logger.error('SchemaCache: Failed to clear cache', error);
    }
  }

  /**
   * Retrieves cache metadata.
   *
   * @remarks
   * Returns cached metadata if available, otherwise calculates it from
   * all cached schemas.
   *
   * @returns Metadata object with cache statistics
   *
   * @example
   * ```ts
   * const meta = await cache.getMetadata();
   * console.log(`Cached ${meta.totalSchemas} schemas`);
   * console.log(`Total: ${meta.totalForms} forms, ${meta.totalFields} fields`);
   * ```
   */
  async getMetadata(): Promise<SchemaCacheMetadata> {
    if (!this.enabled) {
      return {
        totalSchemas: 0,
        totalFields: 0,
        totalForms: 0,
        lastUpdated: 0,
      };
    }

    try {
      const metadata =
        await this.adapter.get<SchemaCacheMetadata>(METADATA_KEY);

      if (metadata) {
        return metadata;
      }

      // If no metadata, calculate it
      return await this.calculateMetadata();
    } catch (error) {
      logger.error('SchemaCache: Failed to get metadata', error);
      return {
        totalSchemas: 0,
        totalFields: 0,
        totalForms: 0,
        lastUpdated: 0,
      };
    }
  }

  /**
   * Checks if a URL is cached.
   *
   * @param url - Page URL
   *
   * @returns True if schema is cached, false otherwise
   *
   * @example
   * ```ts
   * if (await cache.has('https://example.com/form')) {
   *   console.log('Schema is cached');
   * }
   * ```
   */
  async has(url: string): Promise<boolean> {
    if (!this.enabled) return false;

    const cacheKey = this.getCacheKey(url);
    const cached = await this.adapter.get(cacheKey);
    return cached !== null;
  }

  /**
   * Calculates approximate cache size in bytes.
   *
   * @remarks
   * Size is estimated based on key and value JSON string lengths.
   * Accounts for UTF-16 encoding (2 bytes per character).
   *
   * @returns Approximate cache size in bytes
   *
   * @example
   * ```ts
   * const size = await cache.getCacheSize();
   * console.log(`Cache size: ${(size / 1024).toFixed(2)} KB`);
   * ```
   */
  async getCacheSize(): Promise<number> {
    if (!this.enabled) return 0;

    let totalSize = 0;

    try {
      const keys = await this.adapter.keys();

      for (const key of keys) {
        if (key.startsWith(CACHE_PREFIX)) {
          const value = await this.adapter.get(key);
          if (value) {
            // Approximate size: key + value JSON string length * 2 (UTF-16)
            const jsonString = JSON.stringify(value);
            totalSize += (key.length + jsonString.length) * 2;
          }
        }
      }
    } catch (error) {
      logger.error('SchemaCache: Failed to calculate size', error);
    }

    return totalSize;
  }

  /**
   * Gets cache size in human-readable format.
   *
   * @returns Formatted size string (e.g., "1.5 MB", "512 KB")
   *
   * @example
   * ```ts
   * const size = await cache.getCacheSizeFormatted();
   * console.log(`Cache size: ${size}`);
   * ```
   */
  async getCacheSizeFormatted(): Promise<string> {
    const bytes = await this.getCacheSize();

    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
  }

  /**
   * Generates a normalized cache key for a URL.
   *
   * @remarks
   * Removes trailing slashes, hash fragments, and query parameters
   * to ensure consistent caching across URL variations.
   *
   * @param url - Page URL
   *
   * @returns Normalized cache key
   *
   * @internal
   */
  private getCacheKey(url: string): string {
    // Normalize URL (remove trailing slash, hash, query params for caching)
    try {
      const parsed = new URL(url);
      const normalized = `${parsed.origin}${parsed.pathname}`.replace(
        /\/$/,
        ''
      );
      return `${CACHE_PREFIX}${normalized}`;
    } catch {
      // If URL parsing fails, use as-is
      return `${CACHE_PREFIX}${url}`;
    }
  }

  /**
   * Updates cache metadata.
   *
   * @remarks
   * Recalculates and stores metadata after cache modifications.
   *
   * @internal
   */
  private async updateMetadata(): Promise<void> {
    try {
      const metadata = await this.calculateMetadata();
      await this.adapter.set(METADATA_KEY, metadata);
    } catch (error) {
      logger.error('SchemaCache: Failed to update metadata', error);
    }
  }

  /**
   * Calculates metadata from all cached schemas.
   *
   * @remarks
   * Iterates through all cached schemas to compute aggregate statistics.
   *
   * @returns Calculated metadata object
   *
   * @internal
   */
  private async calculateMetadata(): Promise<SchemaCacheMetadata> {
    const schemas = await this.getAll();

    let totalFields = 0;
    let totalForms = 0;

    schemas.forEach(cached => {
      totalForms += cached.schema.forms.length;
      cached.schema.forms.forEach(form => {
        totalFields += form.fields.length;
      });
    });

    return {
      totalSchemas: schemas.length,
      totalFields,
      totalForms,
      lastUpdated: Date.now(),
    };
  }
}
