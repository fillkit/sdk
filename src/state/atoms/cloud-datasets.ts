/**
 * Cloud dataset caching with IndexedDB persistence.
 *
 * @remarks
 * Manages cached datasets from CloudProvider using IndexedDB for efficient
 * storage of large datasets. IndexedDB is preferred over localStorage because
 * it can handle much larger data sizes (10MB+) without blocking the main thread.
 *
 * **Key Features:**
 * - IndexedDB persistence for large datasets
 * - Automatic cache loading on initialization
 * - Automatic cache saving on updates
 * - Dataset versioning for cache invalidation
 * - Schema storage alongside data
 *
 * **Storage:**
 * - Database: `fillkit-db`
 * - Store: `datasets`
 * - Key: `cloud-datasets`
 * - Format: JSON
 *
 * **Architecture:**
 * - Uses nanostores atom for reactive state
 * - Asynchronously loads from IndexedDB on init
 * - Automatically persists changes to IndexedDB
 * - Gracefully degrades if IndexedDB unavailable
 *
 * @example
 * Basic dataset caching:
 * ```ts
 * import { cloudDatasets } from './atoms/cloud-datasets';
 *
 * // Cache a new dataset
 * cloudDatasets.set({
 *   ...cloudDatasets.get(),
 *   users: {
 *     name: 'users',
 *     data: [{ email: 'alice@example.com' }, { email: 'bob@example.com' }],
 *     cachedAt: Date.now(),
 *     version: '1.0'
 *   }
 * });
 *
 * // Retrieve cached dataset
 * const datasets = cloudDatasets.get();
 * const userDataset = datasets['users'];
 * if (userDataset) {
 *   console.log('Found', userDataset.data.length, 'records');
 * }
 * ```
 */

import { atom } from 'nanostores';
import type { WritableAtom } from 'nanostores';
import { safeJsonParse } from '../../utils/sanitize.js';

/**
 * Cached dataset entry structure.
 *
 * @remarks
 * Represents a single cached dataset with its data, schema, and metadata.
 * Each dataset is stored with a timestamp and optional version for cache
 * invalidation and freshness tracking.
 */
export interface DatasetEntry {
  /**
   * Unique dataset identifier.
   *
   * @remarks
   * Used as the key in the CloudDatasetsState map. Typically matches
   * the dataset name from the cloud API.
   */
  name: string;

  /**
   * Array of data records.
   *
   * @remarks
   * Each record is a key-value object representing a single data entry.
   * Structure varies by dataset type (users, addresses, products, etc.).
   */
  data: Record<string, unknown>[];

  /**
   * Optional schema definition for the dataset.
   *
   * @remarks
   * Describes the structure and types of fields in the data records.
   * Used for validation and type inference.
   */
  schema?: Record<string, unknown>;

  /**
   * Timestamp when this dataset was cached.
   *
   * @remarks
   * Unix timestamp in milliseconds. Used to determine cache freshness
   * and implement cache expiration policies.
   */
  cachedAt: number;

  /**
   * Optional version identifier for cache invalidation.
   *
   * @remarks
   * When the cloud dataset version changes, cached entries with
   * mismatched versions can be invalidated and refreshed.
   */
  version?: string;
}

/**
 * Cloud Datasets State - Map of dataset name → dataset data
 */
export type CloudDatasetsState = Record<string, DatasetEntry>;

/**
 * Default cloud datasets (empty)
 */
export const defaultCloudDatasets: CloudDatasetsState = {};

/**
 * IndexedDB storage helper (async load/save)
 */
const DB_NAME = 'fillkit-db';
const STORE_NAME = 'datasets';
const KEY = 'cloud-datasets';

let dbReady: Promise<IDBDatabase> | null = null;

/**
 * Opens the IndexedDB database connection.
 *
 * @remarks
 * Creates the database and object store if they don't exist. Uses a singleton
 * pattern to ensure only one connection is opened. The database version is set
 * to 1 and will trigger an upgrade if the database doesn't exist.
 *
 * @returns Promise that resolves to the database connection
 *
 * @internal
 */
function openDB(): Promise<IDBDatabase> {
  if (dbReady) return dbReady;

  dbReady = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbReady;
}

/**
 * Loads cached datasets from IndexedDB.
 *
 * @remarks
 * Called once during atom initialization to restore previously cached datasets.
 * Gracefully handles errors by returning the default empty state. Uses a
 * read-only transaction for optimal performance.
 *
 * @returns Promise that resolves to the cached datasets or default empty state
 *
 * @internal
 */
async function loadFromIDB(): Promise<CloudDatasetsState> {
  try {
    const db = await openDB();
    return new Promise(resolve => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(KEY);

      request.onsuccess = () => {
        const value = request.result;
        resolve(
          value
            ? safeJsonParse(value as string, defaultCloudDatasets)
            : defaultCloudDatasets
        );
      };

      request.onerror = () => resolve(defaultCloudDatasets);
    });
  } catch {
    return defaultCloudDatasets;
  }
}

/**
 * Saves datasets to IndexedDB.
 *
 * @remarks
 * Called automatically whenever the atom state changes. Uses a readwrite
 * transaction to persist the entire dataset map. Fails silently if IndexedDB
 * is unavailable (e.g., in private browsing mode).
 *
 * @param data - The complete datasets state to persist
 *
 * @internal
 */
async function saveToIDB(data: CloudDatasetsState): Promise<void> {
  try {
    const db = await openDB();
    return new Promise(resolve => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(JSON.stringify(data), KEY);

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve(); // Silent fail
    });
  } catch {
    // Silent fail if IndexedDB unavailable
  }
}

/**
 * Reactive atom for cloud datasets with IndexedDB persistence.
 *
 * @remarks
 * This atom manages cached datasets from CloudProvider. Unlike other atoms
 * that use localStorage, this uses IndexedDB for better performance with
 * large datasets. The atom automatically loads cached data on initialization
 * and persists changes asynchronously.
 *
 * **Persistence:**
 * - Storage: IndexedDB
 * - Database: `fillkit-db`
 * - Store: `datasets`
 * - Key: `cloud-datasets`
 *
 * **State Management:**
 * - Read: `cloudDatasets.get()`
 * - Write: `cloudDatasets.set(newState)`
 * - Subscribe: `cloudDatasets.subscribe(callback)`
 *
 * @example
 * Caching a dataset:
 * ```ts
 * import { cloudDatasets } from './atoms/cloud-datasets';
 *
 * // Cache new dataset
 * cloudDatasets.set({
 *   ...cloudDatasets.get(),
 *   users: {
 *     name: 'users',
 *     data: [{ email: 'alice@example.com' }, { email: 'bob@example.com' }],
 *     cachedAt: Date.now(),
 *     version: '1.0'
 *   }
 * });
 * ```
 *
 * @example
 * Retrieving cached data:
 * ```ts
 * import { cloudDatasets } from './atoms/cloud-datasets';
 *
 * // Get specific dataset
 * const datasets = cloudDatasets.get();
 * const userDataset = datasets['users'];
 *
 * if (userDataset) {
 *   console.log('Cache hit! Found', userDataset.data.length, 'records');
 *   console.log('Cached at:', new Date(userDataset.cachedAt));
 * } else {
 *   console.log('Cache miss - need to fetch from API');
 * }
 * ```
 *
 * @example
 * Cache invalidation:
 * ```ts
 * import { cloudDatasets } from './atoms/cloud-datasets';
 *
 * // Remove specific dataset
 * const current = cloudDatasets.get();
 * const { users, ...rest } = current;
 * cloudDatasets.set(rest);
 *
 * // Clear all cached datasets
 * cloudDatasets.set({});
 * ```
 *
 * @example
 * Reactive cache updates:
 * ```ts
 * import { cloudDatasets } from './atoms/cloud-datasets';
 *
 * // Subscribe to cache changes
 * const unsubscribe = cloudDatasets.subscribe((datasets) => {
 *   const datasetCount = Object.keys(datasets).length;
 *   console.log('Cache updated:', datasetCount, 'datasets cached');
 *
 *   // Update UI with cached data
 *   updateDatasetList(datasets);
 * });
 *
 * // Clean up
 * onCleanup(() => unsubscribe());
 * ```
 */
const baseAtom = atom<CloudDatasetsState>(defaultCloudDatasets);

// Load from IndexedDB on initialization
loadFromIDB().then(data => {
  baseAtom.set(data);
});

// Save to IndexedDB on every update
baseAtom.subscribe(data => {
  saveToIDB(data);
});

export const cloudDatasets: WritableAtom<CloudDatasetsState> = baseAtom;
