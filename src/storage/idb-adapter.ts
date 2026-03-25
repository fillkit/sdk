/**
 * IndexedDB storage adapter for nanostores persistent atoms.
 *
 * @remarks
 * Provides an async storage interface compatible with `@nanostores/persistent`.
 * Enables storing large datasets in IndexedDB instead of localStorage, which is
 * limited to ~5-10MB. This adapter handles all IndexedDB operations transparently.
 *
 * **Key Features:**
 * - Compatible with nanostores persistentAtom
 * - Async get/set operations
 * - Automatic database initialization
 * - Graceful error handling
 * - Singleton database connection
 *
 * **Use Cases:**
 * - Storing large datasets (10MB+)
 * - Caching cloud-generated data
 * - Persisting complex state objects
 *
 * @example
 * Basic usage with nanostores:
 * ```ts
 * import { persistentAtom } from '@nanostores/persistent';
 * import { createIDBStorage } from './idb-adapter';
 *
 * const idb = createIDBStorage('fillkit-db', 'datasets');
 *
 * export const datasets = persistentAtom('datasets', {}, {
 *   encode: JSON.stringify,
 *   decode: JSON.parse,
 *   storage: idb
 * });
 * ```
 *
 * @example
 * Custom database configuration:
 * ```ts
 * // Use custom database and store names
 * const storage = createIDBStorage('myapp-cache', 'user-data');
 *
 * const userCache = persistentAtom('cache', null, {
 *   encode: JSON.stringify,
 *   decode: JSON.parse,
 *   storage
 * });
 * ```
 */

/**
 * Storage interface compatible with @nanostores/persistent.
 *
 * @remarks
 * Defines the minimal interface required by nanostores for persistent storage.
 * Both get and set methods can be sync or async.
 */
import { logger } from '@/core/Logger.js';

export interface PersistentStorage {
  /**
   * Retrieves a value from storage.
   *
   * @param key - Storage key
   *
   * @returns Value as string, null if not found, or Promise of either
   */
  get: (key: string) => Promise<string | null> | string | null;

  /**
   * Stores a value in storage.
   *
   * @param key - Storage key
   * @param value - Value to store (as string)
   *
   * @returns void or Promise<void>
   */
  set: (key: string, value: string) => Promise<void> | void;
}

/**
 * Creates an IndexedDB storage adapter for nanostores.
 *
 * @remarks
 * Returns a storage object with get/set methods that nanostores can use
 * for persistence. The adapter handles database initialization, connection
 * management, and error handling automatically.
 *
 * **Implementation Details:**
 * - Uses singleton pattern for database connection
 * - Automatically creates database and object store on first use
 * - Gracefully handles errors by logging and returning null/void
 * - Database version is fixed at 1
 *
 * @param dbName - IndexedDB database name (default: 'fillkit-db')
 * @param storeName - Object store name (default: 'nanostores')
 *
 * @returns Storage adapter with get/set methods
 *
 * @example
 * Basic usage:
 * ```ts
 * const storage = createIDBStorage('myapp-db', 'atoms');
 *
 * // Use with persistentAtom
 * const myAtom = persistentAtom('key', defaultValue, {
 *   encode: JSON.stringify,
 *   decode: JSON.parse,
 *   storage
 * });
 * ```
 */
export function createIDBStorage(
  dbName = 'fillkit-db',
  storeName = 'nanostores'
): PersistentStorage {
  let dbPromise: Promise<IDBDatabase> | null = null;

  /**
   * Opens or reuses the IndexedDB connection.
   *
   * @remarks
   * Uses a singleton pattern to ensure only one database connection exists.
   * Creates the object store if it doesn't exist during upgrade.
   *
   * @returns Promise that resolves to the database connection
   *
   * @internal
   */
  function openDB(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName, 1);

      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return dbPromise;
  }

  /**
   * Retrieves a value from IndexedDB.
   *
   * @remarks
   * Returns null on any error to allow nanostores to use default values.
   * Errors are logged to console for debugging.
   *
   * @param key - Storage key
   *
   * @returns Value as string or null if not found/error
   *
   * @internal
   */
  async function get(key: string): Promise<string | null> {
    try {
      const db = await openDB();
      return new Promise(resolve => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);

        req.onsuccess = () => {
          const value = req.result;
          resolve(value ?? null);
        };

        req.onerror = () => {
          logger.error('IDB get error:', req.error);
          resolve(null);
        };
      });
    } catch (error) {
      logger.error('IDB get error:', error);
      return null;
    }
  }

  /**
   * Stores a value in IndexedDB.
   *
   * @remarks
   * Silently fails on error to prevent breaking nanostores atom updates.
   * Errors are logged to console for debugging.
   *
   * @param key - Storage key
   * @param value - Value to store (as string)
   *
   * @internal
   */
  async function set(key: string, value: string): Promise<void> {
    try {
      const db = await openDB();
      return new Promise(resolve => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.put(value, key);

        tx.oncomplete = () => resolve();
        tx.onerror = () => {
          logger.error('IDB set error:', tx.error);
          resolve();
        };
      });
    } catch (error) {
      logger.error('IDB set error:', error);
    }
  }

  return { get, set };
}
