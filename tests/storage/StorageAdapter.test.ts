import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocalStorageAdapter } from '@/storage/StorageAdapter.js';

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    localStorage.clear();
    adapter = new LocalStorageAdapter();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('constructor', () => {
    it('creates adapter with default prefix', async () => {
      await adapter.set('key', 'value');
      expect(localStorage.getItem('fillkit:key')).toBe('"value"');
    });

    it('creates adapter with custom prefix', async () => {
      const custom = new LocalStorageAdapter('myapp');
      await custom.set('key', 'value');
      expect(localStorage.getItem('myapp:key')).toBe('"value"');
    });
  });

  describe('get/set roundtrip', () => {
    it('stores and retrieves a string', async () => {
      await adapter.set('name', 'Alice');
      const result = await adapter.get<string>('name');
      expect(result).toBe('Alice');
    });

    it('stores and retrieves an object', async () => {
      const data = { name: 'Alice', age: 30, active: true };
      await adapter.set('user', data);
      const result = await adapter.get<typeof data>('user');
      expect(result).toEqual(data);
    });

    it('stores and retrieves a number', async () => {
      await adapter.set('count', 42);
      const result = await adapter.get<number>('count');
      expect(result).toBe(42);
    });

    it('stores and retrieves an array', async () => {
      const items = ['a', 'b', 'c'];
      await adapter.set('items', items);
      const result = await adapter.get<string[]>('items');
      expect(result).toEqual(items);
    });
  });

  describe('get non-existent key', () => {
    it('returns null for missing key', async () => {
      const result = await adapter.get('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('removes an existing item', async () => {
      await adapter.set('toRemove', 'value');
      await adapter.remove('toRemove');
      const result = await adapter.get('toRemove');
      expect(result).toBeNull();
    });

    it('does not throw when removing non-existent key', async () => {
      await expect(adapter.remove('missing')).resolves.toBeUndefined();
    });
  });

  describe('clear', () => {
    it('removes all items with prefix', async () => {
      await adapter.set('a', 1);
      await adapter.set('b', 2);
      await adapter.clear();
      expect(await adapter.get('a')).toBeNull();
      expect(await adapter.get('b')).toBeNull();
    });

    it('does not remove items from other prefixes', async () => {
      const other = new LocalStorageAdapter('other');
      await other.set('keep', 'this');
      await adapter.set('remove', 'this');

      await adapter.clear();

      expect(await other.get<string>('keep')).toBe('this');
    });
  });

  describe('keys', () => {
    it('returns keys for items with prefix', async () => {
      await adapter.set('alpha', 1);
      await adapter.set('beta', 2);
      const keys = await adapter.keys();
      expect(keys).toContain('alpha');
      expect(keys).toContain('beta');
      expect(keys).toHaveLength(2);
    });

    it('returns empty array when no items exist', async () => {
      const keys = await adapter.keys();
      expect(keys).toEqual([]);
    });
  });

  describe('size', () => {
    it('returns count of items with prefix', async () => {
      expect(await adapter.size()).toBe(0);
      await adapter.set('a', 1);
      await adapter.set('b', 2);
      expect(await adapter.size()).toBe(2);
    });
  });

  describe('corrupted data', () => {
    it('returns null for invalid JSON', async () => {
      localStorage.setItem('fillkit:corrupt', 'not valid json {{{');
      const result = await adapter.get('corrupt');
      expect(result).toBeNull();
    });
  });

  describe('prefix isolation', () => {
    it('two adapters with different prefixes do not interfere', async () => {
      const adapterA = new LocalStorageAdapter('app-a');
      const adapterB = new LocalStorageAdapter('app-b');

      await adapterA.set('key', 'valueA');
      await adapterB.set('key', 'valueB');

      expect(await adapterA.get<string>('key')).toBe('valueA');
      expect(await adapterB.get<string>('key')).toBe('valueB');
    });
  });
});
