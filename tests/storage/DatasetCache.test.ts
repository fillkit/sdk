import { describe, it, expect, beforeAll } from 'vitest';
import { DatasetCache } from '@/storage/DatasetCache.js';

/**
 * DatasetCache relies on IndexedDB, which is not available in jsdom.
 * These tests cover the synchronous formatSize utility and verify
 * that the constructor does not throw. Full integration tests would
 * require a real IndexedDB environment (e.g., Playwright).
 */
describe('DatasetCache', () => {
  describe('constructor', () => {
    it('creates instance with default config', () => {
      const cache = new DatasetCache();
      expect(cache).toBeInstanceOf(DatasetCache);
    });

    it('creates instance with custom config', () => {
      const cache = new DatasetCache({ maxEntries: 10, maxAge: 1000 });
      expect(cache).toBeInstanceOf(DatasetCache);
    });
  });

  describe('formatSize', () => {
    let cache: DatasetCache;

    beforeAll(() => {
      cache = new DatasetCache();
    });

    it('formats bytes', () => {
      expect(cache.formatSize(0)).toBe('0 B');
      expect(cache.formatSize(512)).toBe('512 B');
      expect(cache.formatSize(1023)).toBe('1023 B');
    });

    it('formats kilobytes', () => {
      expect(cache.formatSize(1024)).toBe('1.00 KB');
      expect(cache.formatSize(1536)).toBe('1.50 KB');
      expect(cache.formatSize(1024 * 512)).toBe('512.00 KB');
    });

    it('formats megabytes', () => {
      expect(cache.formatSize(1024 * 1024)).toBe('1.00 MB');
      expect(cache.formatSize(1024 * 1024 * 2.5)).toBe('2.50 MB');
      expect(cache.formatSize(1024 * 1024 * 100)).toBe('100.00 MB');
    });

    it('handles boundary between KB and MB', () => {
      // Just below 1 MB
      expect(cache.formatSize(1024 * 1024 - 1)).toContain('KB');
      // Exactly 1 MB
      expect(cache.formatSize(1024 * 1024)).toContain('MB');
    });
  });

  describe('close', () => {
    it('does not throw when called before any DB operation', () => {
      const cache = new DatasetCache();
      expect(() => cache.close()).not.toThrow();
    });

    it('can be called multiple times safely', () => {
      const cache = new DatasetCache();
      cache.close();
      cache.close();
      // No error expected
    });
  });
});
