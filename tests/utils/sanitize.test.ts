import { describe, it, expect } from 'vitest';
import { sanitizeObject, safeJsonParse } from '../../src/utils/sanitize.js';

describe('sanitize', () => {
  describe('sanitizeObject', () => {
    it('strips __proto__ key', () => {
      const obj = JSON.parse('{"__proto__": {"polluted": true}, "safe": 1}');
      const result = sanitizeObject(obj);
      expect(result).toEqual({ safe: 1 });
      expect('__proto__' in result).toBe(false);
    });

    it('strips constructor key', () => {
      const obj = { constructor: 'bad', name: 'ok' };
      const result = sanitizeObject(obj);
      expect(result).toEqual({ name: 'ok' });
    });

    it('strips prototype key', () => {
      const obj = { prototype: {}, value: 42 };
      const result = sanitizeObject(obj);
      expect(result).toEqual({ value: 42 });
    });

    it('preserves safe keys', () => {
      const obj = { a: 1, b: 'hello', c: true, d: null };
      const result = sanitizeObject(obj);
      expect(result).toEqual({ a: 1, b: 'hello', c: true, d: null });
    });

    it('returns arrays as-is', () => {
      const arr = [1, 2, 3] as unknown as Record<string, unknown>;
      const result = sanitizeObject(arr);
      expect(result).toEqual([1, 2, 3]);
    });

    it('returns null as-is', () => {
      const result = sanitizeObject(null as unknown as Record<string, unknown>);
      expect(result).toBeNull();
    });

    it('returns non-objects as-is', () => {
      const result = sanitizeObject(
        'string' as unknown as Record<string, unknown>
      );
      expect(result).toBe('string');
    });
  });

  describe('safeJsonParse', () => {
    it('parses valid JSON and sanitizes', () => {
      const result = safeJsonParse('{"name":"test","age":25}', {});
      expect(result).toEqual({ name: 'test', age: 25 });
    });

    it('strips dangerous keys from parsed JSON', () => {
      const result = safeJsonParse(
        '{"__proto__":{"bad":true},"safe":"value"}',
        {}
      );
      expect(result).toEqual({ safe: 'value' });
    });

    it('returns fallback for invalid JSON', () => {
      const fallback = { default: true };
      const result = safeJsonParse('not-json', fallback);
      expect(result).toBe(fallback);
    });

    it('returns fallback for empty string', () => {
      const fallback = { empty: true };
      const result = safeJsonParse('', fallback);
      expect(result).toBe(fallback);
    });

    it('parses primitive JSON values without sanitization', () => {
      expect(safeJsonParse('"hello"', '')).toBe('hello');
      expect(safeJsonParse('42', 0)).toBe(42);
      expect(safeJsonParse('true', false)).toBe(true);
      expect(safeJsonParse('null', 'fallback')).toBeNull();
    });

    it('parses arrays without sanitization', () => {
      const result = safeJsonParse('[1,2,3]', []);
      expect(result).toEqual([1, 2, 3]);
    });
  });
});
