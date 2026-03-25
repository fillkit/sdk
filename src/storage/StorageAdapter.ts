/**
 * Storage adapter implementations for flexible backend support.
 *
 * @remarks
 * Provides a unified interface for different storage backends including localStorage,
 * sessionStorage, IndexedDB, and in-memory storage. All adapters implement the same
 * async interface for consistency, even when wrapping synchronous APIs.
 *
 * **Available Adapters:**
 * - `LocalStorageAdapter`: Browser localStorage with quota handling
 * - `SessionStorageAdapter`: Browser sessionStorage (session-only)
 * - `MemoryAdapter`: In-memory Map (for testing/temporary data)
 * - `IndexedDBAdapter`: IndexedDB for large datasets
 *
 * **Key Features:**
 * - Unified async interface across all backends
 * - Automatic JSON serialization/deserialization
 * - Quota exceeded error handling
 * - Availability detection and graceful degradation
 * - Custom event emission for quota warnings
 *
 * @example
 * Choosing an adapter:
 * ```ts
 * // For persistent data (survives page reloads)
 * const adapter = new LocalStorageAdapter();
 *
 * // For session-only data (cleared on tab close)
 * const adapter = new SessionStorageAdapter();
 *
 * // For large datasets (10MB+)
 * const adapter = new IndexedDBAdapter();
 *
 * // For testing or temporary data
 * const adapter = new MemoryAdapter();
 * ```
 */

import { logger } from '@/core/Logger.js';
import { safeJsonParse } from '../utils/sanitize.js';

/**
 * Storage adapter interface for pluggable storage backends.
 *
 * @remarks
 * Defines a common async interface that all storage adapters must implement.
 * Provides type-safe get/set operations with automatic JSON serialization.
 */
export interface StorageAdapter {
  /**
   * Retrieves a value from storage.
   *
   * @param key - Storage key
   *
   * @returns Value or null if not found
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Stores a value in storage.
   *
   * @param key - Storage key
   * @param value - Value to store
   *
   * @throws Error if storage quota is exceeded or operation fails
   */
  set<T>(key: string, value: T): Promise<void>;

  /**
   * Removes a value from storage.
   *
   * @param key - Storage key
   */
  remove(key: string): Promise<void>;

  /**
   * Clears all values from storage.
   *
   * @remarks
   * This operation cannot be undone. Use with caution.
   */
  clear(): Promise<void>;

  /**
   * Retrieves all storage keys.
   *
   * @returns Array of all keys in storage
   */
  keys(): Promise<string[]>;

  /**
   * Gets the number of items in storage.
   *
   * @returns Count of stored items
   */
  size(): Promise<number>;
}

/**
 * localStorage adapter with async interface.
 *
 * @remarks
 * Wraps browser localStorage with an async interface for consistency with other adapters.
 * Automatically handles JSON serialization/deserialization and quota exceeded errors.
 * Includes availability detection for private browsing mode compatibility.
 *
 * **Features:**
 * - Automatic key prefixing to avoid conflicts
 * - Quota exceeded error detection and event emission
 * - Graceful degradation when localStorage is unavailable
 * - JSON serialization for complex objects
 *
 * @example
 * Basic usage:
 * ```ts
 * const adapter = new LocalStorageAdapter('myapp');
 *
 * // Store data
 * await adapter.set('user', { name: 'Alice', age: 30 });
 *
 * // Retrieve data
 * const user = await adapter.get<{ name: string; age: number }>('user');
 * console.log(user?.name); // 'Alice'
 *
 * // Check size
 * const count = await adapter.size();
 * console.log(`Stored ${count} items`);
 * ```
 */
export class LocalStorageAdapter implements StorageAdapter {
  private readonly prefix: string;
  private readonly available: boolean;

  /**
   * Creates a new LocalStorageAdapter.
   *
   * @param prefix - Key prefix to avoid conflicts (default: 'fillkit')
   */
  constructor(prefix = 'fillkit') {
    this.prefix = prefix;
    this.available = this.checkAvailability();
  }

  /**
   * Generates a prefixed key for localStorage.
   *
   * @param key - Unprefixed key
   *
   * @returns Prefixed key
   *
   * @internal
   */
  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  /**
   * Checks if localStorage is available.
   *
   * @remarks
   * Tests localStorage availability by attempting a write operation.
   * Returns false in private browsing mode or when localStorage is disabled.
   *
   * @returns True if localStorage is available
   *
   * @internal
   */
  private checkAvailability(): boolean {
    try {
      const test = '__fillkit_storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private isAvailable(): boolean {
    return this.available;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable()) {
      logger.warn('FillKit: localStorage not available');
      return null;
    }

    try {
      const value = localStorage.getItem(this.getKey(key));
      if (value === null) {
        return null;
      }
      return safeJsonParse<T | null>(value, null);
    } catch (error) {
      logger.error('FillKit: Failed to get from localStorage', error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (!this.isAvailable()) {
      logger.warn('FillKit: localStorage not available');
      return;
    }

    try {
      localStorage.setItem(this.getKey(key), JSON.stringify(value));
    } catch (error) {
      // Check for quota exceeded error
      if (
        error instanceof DOMException &&
        error.name === 'QuotaExceededError'
      ) {
        logger.error('FillKit: localStorage quota exceeded');
        this.emitQuotaWarning();
      } else {
        logger.error('FillKit: Failed to set in localStorage', error);
      }
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }

    try {
      localStorage.removeItem(this.getKey(key));
    } catch (error) {
      logger.error('FillKit: Failed to remove from localStorage', error);
    }
  }

  async clear(): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }

    try {
      const keys = await this.keys();
      for (const key of keys) {
        localStorage.removeItem(this.getKey(key));
      }
    } catch (error) {
      logger.error('FillKit: Failed to clear localStorage', error);
    }
  }

  async keys(): Promise<string[]> {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const allKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${this.prefix}:`)) {
          allKeys.push(key.substring(this.prefix.length + 1));
        }
      }
      return allKeys;
    } catch (error) {
      logger.error('FillKit: Failed to get keys from localStorage', error);
      return [];
    }
  }

  async size(): Promise<number> {
    const keys = await this.keys();
    return keys.length;
  }

  /**
   * Emits a quota exceeded warning event.
   *
   * @remarks
   * Dispatches a custom event that applications can listen for to handle
   * storage quota issues (e.g., show user notification, clear old data).
   *
   * @internal
   */
  private emitQuotaWarning(): void {
    const event = new CustomEvent('fillkit:storageQuotaExceeded', {
      detail: { adapter: 'LocalStorageAdapter' },
    });
    document.dispatchEvent(event);
  }
}

/**
 * sessionStorage adapter with async interface.
 *
 * @remarks
 * Similar to LocalStorageAdapter but uses sessionStorage, which is cleared when
 * the browser tab is closed. Useful for temporary data that shouldn't persist
 * across sessions.
 *
 * **Features:**
 * - Session-only persistence (cleared on tab close)
 * - Automatic key prefixing
 * - Quota exceeded error detection
 * - JSON serialization
 *
 * @example
 * Basic usage:
 * ```ts
 * const adapter = new SessionStorageAdapter('myapp');
 *
 * // Store temporary data
 * await adapter.set('tempData', { sessionId: '123' });
 *
 * // Data persists only for this session
 * const data = await adapter.get('tempData');
 * ```
 */
export class SessionStorageAdapter implements StorageAdapter {
  private readonly prefix: string;
  private readonly available: boolean;

  /**
   * Creates a new SessionStorageAdapter.
   *
   * @param prefix - Key prefix to avoid conflicts (default: 'fillkit')
   */
  constructor(prefix = 'fillkit') {
    this.prefix = prefix;
    this.available = this.checkAvailability();
  }

  /**
   * Generates a prefixed key for sessionStorage.
   *
   * @param key - Unprefixed key
   *
   * @returns Prefixed key
   *
   * @internal
   */
  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  /**
   * Checks if sessionStorage is available.
   *
   * @remarks
   * Tests sessionStorage availability by attempting a write operation.
   *
   * @returns True if sessionStorage is available
   *
   * @internal
   */
  private checkAvailability(): boolean {
    try {
      const test = '__fillkit_storage_test__';
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private isAvailable(): boolean {
    return this.available;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable()) {
      logger.warn('FillKit: sessionStorage not available');
      return null;
    }

    try {
      const value = sessionStorage.getItem(this.getKey(key));
      if (value === null) {
        return null;
      }
      return safeJsonParse<T | null>(value, null);
    } catch (error) {
      logger.error('FillKit: Failed to get from sessionStorage', error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (!this.isAvailable()) {
      logger.warn('FillKit: sessionStorage not available');
      return;
    }

    try {
      sessionStorage.setItem(this.getKey(key), JSON.stringify(value));
    } catch (error) {
      // Check for quota exceeded error
      if (
        error instanceof DOMException &&
        error.name === 'QuotaExceededError'
      ) {
        logger.error('FillKit: sessionStorage quota exceeded');
        this.emitQuotaWarning();
      } else {
        logger.error('FillKit: Failed to set in sessionStorage', error);
      }
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }

    try {
      sessionStorage.removeItem(this.getKey(key));
    } catch (error) {
      logger.error('FillKit: Failed to remove from sessionStorage', error);
    }
  }

  async clear(): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }

    try {
      const keys = await this.keys();
      for (const key of keys) {
        sessionStorage.removeItem(this.getKey(key));
      }
    } catch (error) {
      logger.error('FillKit: Failed to clear sessionStorage', error);
    }
  }

  async keys(): Promise<string[]> {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const allKeys: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(`${this.prefix}:`)) {
          allKeys.push(key.substring(this.prefix.length + 1));
        }
      }
      return allKeys;
    } catch (error) {
      logger.error('FillKit: Failed to get keys from sessionStorage', error);
      return [];
    }
  }

  async size(): Promise<number> {
    const keys = await this.keys();
    return keys.length;
  }

  /**
   * Emits a quota exceeded warning event.
   *
   * @internal
   */
  private emitQuotaWarning(): void {
    const event = new CustomEvent('fillkit:storageQuotaExceeded', {
      detail: { adapter: 'SessionStorageAdapter' },
    });
    document.dispatchEvent(event);
  }
}

/**
 * In-memory storage adapter using a Map.
 *
 * @remarks
 * Stores data in memory only - all data is lost when the page reloads.
 * Useful for testing, temporary data, or when persistent storage is not needed.
 * Values are cloned on get/set to prevent unintended mutations.
 *
 * **Features:**
 * - No persistence (data lost on reload)
 * - No quota limits
 * - Fast synchronous operations wrapped in async interface
 * - Automatic value cloning to prevent mutations
 *
 * @example
 * Basic usage:
 * ```ts
 * const adapter = new MemoryAdapter();
 *
 * // Store data (lost on page reload)
 * await adapter.set('cache', { data: [1, 2, 3] });
 *
 * // Retrieve data
 * const cache = await adapter.get('cache');
 * ```
 *
 * @example
 * Testing usage:
 * ```ts
 * // Perfect for unit tests
 * const adapter = new MemoryAdapter();
 * await adapter.set('test', { value: 123 });
 * const result = await adapter.get('test');
 * expect(result).toEqual({ value: 123 });
 * ```
 */
export class MemoryAdapter implements StorageAdapter {
  private storage: Map<string, unknown> = new Map();

  async get<T>(key: string): Promise<T | null> {
    const value = this.storage.get(key);
    if (value === undefined) {
      return null;
    }
    // Clone the value to prevent mutations
    return structuredClone(value) as T;
  }

  async set<T>(key: string, value: T): Promise<void> {
    // Clone the value to prevent mutations
    this.storage.set(key, structuredClone(value));
  }

  async remove(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }

  async keys(): Promise<string[]> {
    return Array.from(this.storage.keys());
  }

  async size(): Promise<number> {
    return this.storage.size;
  }
}

/**
 * IndexedDB storage adapter for large datasets.
 *
 * @remarks
 * Uses IndexedDB for storing large amounts of data (10MB+) that exceed localStorage
 * limits. Provides async operations with automatic database initialization and
 * quota exceeded error handling.
 *
 * **Features:**
 * - Large dataset support (10MB+)
 * - Automatic database initialization
 * - Quota exceeded error detection
 * - Async operations (non-blocking)
 * - Clean resource management
 *
 * @example
 * Basic usage:
 * ```ts
 * const adapter = new IndexedDBAdapter('myapp-db');
 *
 * // Store large dataset
 * await adapter.set('largeData', { records: [...] });
 *
 * // Retrieve data
 * const data = await adapter.get('largeData');
 *
 * // Clean up when done
 * await adapter.destroy();
 * ```
 */
export class IndexedDBAdapter implements StorageAdapter {
  private db: IDBDatabase | null = null;
  private readonly dbName: string;
  private readonly storeName = 'fillkit-storage';
  private initPromise: Promise<void> | null = null;

  /**
   * Creates a new IndexedDBAdapter.
   *
   * @param dbName - IndexedDB database name (default: 'fillkit-db')
   */
  constructor(dbName = 'fillkit-db') {
    this.dbName = dbName;
  }

  /**
   * Initializes the IndexedDB database.
   *
   * @remarks
   * Uses a singleton pattern to ensure only one initialization occurs.
   * Creates the object store if it doesn't exist.
   *
   * @internal
   */
  async init(): Promise<void> {
    if (this.db) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        logger.error('FillKit: Failed to open IndexedDB', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });

    return this.initPromise;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onerror = () => {
        logger.error('FillKit: Failed to get from IndexedDB', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result ?? null);
      };
    });
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(value, key);

      request.onerror = () => {
        logger.error('FillKit: Failed to set in IndexedDB', request.error);
        // Check for quota exceeded error
        if (request.error && request.error.name === 'QuotaExceededError') {
          this.emitQuotaWarning();
        }
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  async remove(key: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onerror = () => {
        logger.error('FillKit: Failed to remove from IndexedDB', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => {
        logger.error('FillKit: Failed to clear IndexedDB', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  async keys(): Promise<string[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAllKeys();

      request.onerror = () => {
        logger.error(
          'FillKit: Failed to get keys from IndexedDB',
          request.error
        );
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result as string[]);
      };
    });
  }

  async size(): Promise<number> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.count();

      request.onerror = () => {
        logger.error(
          'FillKit: Failed to get size from IndexedDB',
          request.error
        );
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  /**
   * Emits a quota exceeded warning event.
   *
   * @internal
   */
  private emitQuotaWarning(): void {
    const event = new CustomEvent('fillkit:storageQuotaExceeded', {
      detail: { adapter: 'IndexedDBAdapter' },
    });
    document.dispatchEvent(event);
  }

  /**
   * Closes the database connection and cleans up resources.
   *
   * @remarks
   * Should be called when the adapter is no longer needed to free resources.
   *
   * @example
   * ```ts
   * const adapter = new IndexedDBAdapter();
   * // ... use adapter ...
   * await adapter.destroy();
   * ```
   */
  async destroy(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}
