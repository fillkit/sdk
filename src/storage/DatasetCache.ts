/**
 * IndexedDB-based cache for cloud-generated datasets.
 *
 * @remarks
 * Provides efficient storage for large cloud datasets using IndexedDB. Supports
 * versioned dataset management, cache metadata tracking, and automatic expiration.
 * Designed to handle datasets that exceed localStorage size limits (10MB+).
 *
 * **Key Features:**
 * - IndexedDB storage for large datasets
 * - Project-based dataset organization
 * - Version tracking for cache invalidation
 * - Automatic timestamp tracking
 * - Cache metadata and statistics
 * - Expiration and cleanup utilities
 * - LRU eviction when `maxEntries` is exceeded
 * - Lazy expired-entry removal on `get()`
 *
 * **Storage Structure:**
 * - Database: `fillkit-datasets`
 * - Store: `datasets`
 * - Key: `projectId`
 * - Indexes: `lastSync`, `version`, `lastAccessed`
 *
 * @example
 * Basic usage:
 * ```ts
 * const cache = new DatasetCache({ maxEntries: 30 });
 *
 * // Store a dataset
 * await cache.store({
 *   projectId: 'proj_123',
 *   version: '1.0',
 *   data: { users: [...], products: [...] },
 *   lastSync: Date.now()
 * });
 *
 * // Retrieve a dataset (auto-evicts expired entries)
 * const dataset = await cache.get('proj_123');
 * if (dataset) {
 *   console.log('Found dataset:', dataset.data);
 * }
 *
 * // Close the database connection when done
 * cache.close();
 * ```
 */

import type { CachedDataset } from '../types/cloud.js';
import { logger } from '@/core/Logger.js';

const DB_NAME = 'fillkit-datasets';
const DB_VERSION = 2;
const STORE_NAME = 'datasets';

/** Default maximum number of cached entries before LRU eviction. */
const DEFAULT_MAX_ENTRIES = 50;

/** Default maximum age for expired entries (30 days in ms). */
const DEFAULT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Configuration options for DatasetCache.
 */
export interface DatasetCacheConfig {
  /**
   * Maximum number of entries to keep in the cache.
   * When exceeded, the least recently accessed entries are evicted on `store()`.
   *
   * @defaultValue 50
   */
  maxEntries?: number;

  /**
   * Maximum age in milliseconds for expired entry cleanup.
   * Entries older than this are removed during lazy eviction in `get()`.
   *
   * @defaultValue 2592000000 (30 days)
   */
  maxAge?: number;
}

/**
 * Extended dataset record stored in IndexedDB.
 * Adds `lastAccessed` for LRU tracking.
 */
interface DatasetRecord extends CachedDataset {
  /** Timestamp of the last `get()` access, used for LRU eviction. */
  lastAccessed: number;
}

/**
 * Cache manager for cloud-generated datasets using IndexedDB.
 *
 * @remarks
 * Manages dataset storage with automatic versioning, expiration support,
 * and LRU eviction. Uses IndexedDB for efficient storage of large datasets
 * that exceed localStorage limits.
 */
export class DatasetCache {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private readonly maxEntries: number;
  private readonly maxAge: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Creates a new DatasetCache instance.
   *
   * @param config - Optional configuration for cache limits.
   */
  constructor(config: DatasetCacheConfig = {}) {
    this.maxEntries = config.maxEntries ?? DEFAULT_MAX_ENTRIES;
    this.maxAge = config.maxAge ?? DEFAULT_MAX_AGE_MS;

    // Timer-based cleanup every 5 minutes instead of per-get
    this.cleanupTimer = setInterval(
      () => {
        this.removeExpired(this.maxAge).catch(err => {
          logger.warn('DatasetCache: Failed to remove expired entries', err);
        });
      },
      5 * 60 * 1000
    );
  }

  /**
   * Stops the background cleanup timer.
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Opens or creates the IndexedDB database.
   *
   * @remarks
   * Uses a singleton pattern to ensure only one database connection is opened.
   * Creates the object store and indexes if they don't exist.
   * Handles version upgrades to add the `lastAccessed` index.
   *
   * @returns Promise that resolves to the database connection
   *
   * @internal
   */
  private async openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'projectId',
          });
          store.createIndex('lastSync', 'lastSync', { unique: false });
          store.createIndex('version', 'version', { unique: false });
          store.createIndex('lastAccessed', 'lastAccessed', {
            unique: false,
          });
        } else {
          // Add lastAccessed index on upgrade from v1
          const transaction = (event.target as IDBOpenDBRequest).transaction;
          if (transaction) {
            const store = transaction.objectStore(STORE_NAME);
            if (!store.indexNames.contains('lastAccessed')) {
              store.createIndex('lastAccessed', 'lastAccessed', {
                unique: false,
              });
            }
          }
        }
      };
    });

    return this.dbPromise;
  }

  /**
   * Stores a dataset for a project.
   *
   * @remarks
   * Automatically updates the `lastSync` timestamp and sets `lastAccessed`.
   * Overwrites any existing dataset for the same project ID.
   * After storing, evicts LRU entries if `maxEntries` is exceeded.
   *
   * @param dataset - Cached dataset to store
   *
   * @throws Error if storage operation fails
   *
   * @example
   * ```ts
   * await cache.store({
   *   projectId: 'proj_123',
   *   version: '2.0',
   *   data: { users: [...] },
   *   lastSync: Date.now()
   * });
   * ```
   */
  async store(dataset: CachedDataset): Promise<void> {
    const db = await this.openDB();
    const now = Date.now();

    const record: DatasetRecord = {
      ...dataset,
      lastSync: now,
      lastAccessed: now,
    };

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to store dataset'));
    });

    // Evict LRU entries if over the limit
    await this.evictLRU();
  }

  /**
   * Retrieves a dataset for a project.
   *
   * @remarks
   * Performs lazy eviction of expired entries before retrieving.
   * Updates the `lastAccessed` timestamp on successful retrieval for LRU tracking.
   *
   * @param projectId - Project identifier
   *
   * @returns Cached dataset or null if not found
   *
   * @throws Error if retrieval operation fails
   *
   * @example
   * ```ts
   * const dataset = await cache.get('proj_123');
   * if (dataset) {
   *   console.log('Version:', dataset.version);
   *   console.log('Last synced:', new Date(dataset.lastSync));
   * }
   * ```
   */
  async get(projectId: string): Promise<CachedDataset | null> {
    const db = await this.openDB();

    const record = await new Promise<DatasetRecord | null>(
      (resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(projectId);

        request.onsuccess = () => {
          resolve((request.result as DatasetRecord | undefined) ?? null);
        };

        request.onerror = () => reject(new Error('Failed to get dataset'));
      }
    );

    if (!record) {
      return null;
    }

    // Update lastAccessed timestamp for LRU tracking (fire-and-forget)
    this.touchRecord(projectId).catch(err => {
      logger.warn('DatasetCache: Failed to update lastAccessed', err);
    });

    return record;
  }

  /**
   * Retrieves all cached datasets.
   *
   * @returns Array of all cached datasets
   *
   * @throws Error if retrieval operation fails
   *
   * @example
   * ```ts
   * const datasets = await cache.getAll();
   * console.log(`Found ${datasets.length} cached datasets`);
   * datasets.forEach(ds => {
   *   console.log(`Project ${ds.projectId}: ${ds.version}`);
   * });
   * ```
   */
  async getAll(): Promise<CachedDataset[]> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => reject(new Error('Failed to get datasets'));
    });
  }

  /**
   * Removes a dataset for a project.
   *
   * @param projectId - Project identifier
   *
   * @throws Error if removal operation fails
   *
   * @example
   * ```ts
   * await cache.remove('proj_123');
   * console.log('Dataset removed');
   * ```
   */
  async remove(projectId: string): Promise<void> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(projectId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to remove dataset'));
    });
  }

  /**
   * Clears all cached datasets.
   *
   * @remarks
   * Removes all datasets from the cache. This operation cannot be undone.
   *
   * @throws Error if clear operation fails
   *
   * @example
   * ```ts
   * await cache.clear();
   * console.log('All datasets cleared');
   * ```
   */
  async clear(): Promise<void> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to clear datasets'));
    });
  }

  /**
   * Checks if a dataset exists for a project.
   *
   * @param projectId - Project identifier
   *
   * @returns True if dataset exists, false otherwise
   *
   * @example
   * ```ts
   * if (await cache.has('proj_123')) {
   *   console.log('Dataset is cached');
   * } else {
   *   console.log('Need to fetch from API');
   * }
   * ```
   */
  async has(projectId: string): Promise<boolean> {
    const dataset = await this.get(projectId);
    return dataset !== null;
  }

  /**
   * Retrieves cache metadata and statistics.
   *
   * @remarks
   * Calculates total datasets, estimated size, and sync timestamps.
   * Size is estimated based on JSON string length.
   *
   * @returns Metadata object with cache statistics
   *
   * @example
   * ```ts
   * const meta = await cache.getMetadata();
   * console.log(`Total datasets: ${meta.totalDatasets}`);
   * console.log(`Total size: ${cache.formatSize(meta.totalSize)}`);
   * if (meta.oldestSync) {
   *   console.log(`Oldest sync: ${new Date(meta.oldestSync)}`);
   * }
   * ```
   */
  async getMetadata(): Promise<{
    totalDatasets: number;
    totalSize: number;
    oldestSync: number | null;
    newestSync: number | null;
  }> {
    const datasets = await this.getAll();

    let totalSize = 0;
    let oldestSync: number | null = null;
    let newestSync: number | null = null;

    for (const dataset of datasets) {
      // Estimate size (JSON string length)
      totalSize += JSON.stringify(dataset.data).length;

      if (oldestSync === null || dataset.lastSync < oldestSync) {
        oldestSync = dataset.lastSync;
      }

      if (newestSync === null || dataset.lastSync > newestSync) {
        newestSync = dataset.lastSync;
      }
    }

    return {
      totalDatasets: datasets.length,
      totalSize,
      oldestSync,
      newestSync,
    };
  }

  /**
   * Formats a byte size into a human-readable string.
   *
   * @param bytes - Size in bytes
   *
   * @returns Formatted size string (e.g., "1.5 MB", "512 KB")
   *
   * @example
   * ```ts
   * console.log(cache.formatSize(1024)); // "1.00 KB"
   * console.log(cache.formatSize(1048576)); // "1.00 MB"
   * ```
   */
  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /**
   * Removes expired datasets based on age.
   *
   * @remarks
   * Useful for cache cleanup and maintenance. Removes datasets that haven't
   * been synced within the specified time period.
   *
   * @param maxAge - Maximum age in milliseconds (default: 30 days)
   *
   * @returns Number of datasets removed
   *
   * @example
   * ```ts
   * // Remove datasets older than 7 days
   * const removed = await cache.removeExpired(7 * 24 * 60 * 60 * 1000);
   * console.log(`Removed ${removed} expired datasets`);
   * ```
   */
  async removeExpired(maxAge: number = DEFAULT_MAX_AGE_MS): Promise<number> {
    const datasets = await this.getAll();
    const now = Date.now();
    let removed = 0;

    for (const dataset of datasets) {
      if (now - dataset.lastSync > maxAge) {
        await this.remove(dataset.projectId);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Closes the IndexedDB connection and resets the internal promise.
   *
   * @remarks
   * Call this method when the cache is no longer needed to release
   * the underlying IndexedDB connection. After calling `close()`,
   * subsequent operations will re-open the database automatically.
   *
   * @example
   * ```ts
   * cache.close();
   * ```
   */
  close(): void {
    if (this.dbPromise) {
      this.dbPromise
        .then(db => {
          db.close();
        })
        .catch(() => {
          // Ignore errors during close
        });
      this.dbPromise = null;
    }
  }

  /**
   * Updates the `lastAccessed` timestamp for a record (LRU tracking).
   *
   * @param projectId - The project ID to touch.
   */
  private async touchRecord(projectId: string): Promise<void> {
    const db = await this.openDB();

    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(projectId);

      getRequest.onsuccess = () => {
        const record = getRequest.result as DatasetRecord | undefined;
        if (record) {
          record.lastAccessed = Date.now();
          const putRequest = store.put(record);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () =>
            reject(new Error('Failed to touch record'));
        } else {
          resolve();
        }
      };

      getRequest.onerror = () =>
        reject(new Error('Failed to read record for touch'));
    });
  }

  /**
   * Evicts least-recently-accessed entries when the cache exceeds `maxEntries`.
   *
   * @remarks
   * Retrieves all records, sorts by `lastAccessed` ascending, and removes
   * the oldest entries until the count is within the configured limit.
   */
  private async evictLRU(): Promise<void> {
    const db = await this.openDB();

    const allRecords = await new Promise<DatasetRecord[]>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve((request.result as DatasetRecord[]) || []);
      };
      request.onerror = () =>
        reject(new Error('Failed to read records for LRU eviction'));
    });

    if (allRecords.length <= this.maxEntries) {
      return;
    }

    // Sort by lastAccessed ascending (oldest first)
    allRecords.sort((a, b) => (a.lastAccessed ?? 0) - (b.lastAccessed ?? 0));

    const toEvict = allRecords.slice(0, allRecords.length - this.maxEntries);

    if (toEvict.length === 0) return;

    // Batch all deletions in a single readwrite transaction
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      for (const record of toEvict) {
        logger.info(
          `DatasetCache: Evicting LRU entry for project ${record.projectId}`
        );
        store.delete(record.projectId);
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error('Failed to batch-evict LRU entries'));
    });
  }
}
