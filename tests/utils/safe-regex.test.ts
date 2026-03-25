import { describe, it, expect } from 'vitest';
import {
  safeRegexTest,
  safeRegExp,
  isDangerousPattern,
} from '../../src/utils/safe-regex.js';

describe('safe-regex', () => {
  describe('isDangerousPattern', () => {
    it('rejects patterns exceeding max length', () => {
      const long = 'a'.repeat(201);
      expect(isDangerousPattern(long)).toBe(true);
    });

    it('accepts patterns within max length', () => {
      expect(isDangerousPattern('[a-z]+')).toBe(false);
    });

    it('rejects nested quantifiers like (a+)+', () => {
      expect(isDangerousPattern('(a+)+')).toBe(true);
    });

    it('rejects nested quantifiers like (a*)*', () => {
      expect(isDangerousPattern('(a*)*')).toBe(true);
    });

    it('accepts safe patterns', () => {
      expect(isDangerousPattern('^[a-z0-9]+$')).toBe(false);
      expect(isDangerousPattern('\\d{3}-\\d{4}')).toBe(false);
    });
  });

  describe('safeRegexTest', () => {
    it('returns true for matching patterns', () => {
      expect(safeRegexTest('^\\d+$', '123')).toBe(true);
    });

    it('returns false for non-matching patterns', () => {
      expect(safeRegexTest('^\\d+$', 'abc')).toBe(false);
    });

    it('returns true for empty pattern', () => {
      expect(safeRegexTest('', 'anything')).toBe(true);
    });

    it('falls back for dangerous patterns', () => {
      // Dangerous pattern — should not hang, should fall back
      const result = safeRegexTest('(a+)+', 'aaa');
      expect(typeof result).toBe('boolean');
    });

    it('falls back for invalid regex', () => {
      const result = safeRegexTest('[invalid', 'test');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('safeRegExp', () => {
    it('returns RegExp for safe patterns', () => {
      const regex = safeRegExp('^\\d+$');
      expect(regex).toBeInstanceOf(RegExp);
      expect(regex!.test('123')).toBe(true);
    });

    it('returns null for dangerous patterns', () => {
      expect(safeRegExp('(a+)+')).toBeNull();
    });

    it('returns null for invalid patterns', () => {
      expect(safeRegExp('[invalid')).toBeNull();
    });

    it('returns null for empty pattern', () => {
      expect(safeRegExp('')).toBeNull();
    });

    it('respects flags', () => {
      const regex = safeRegExp('hello', 'i');
      expect(regex).toBeInstanceOf(RegExp);
      expect(regex!.test('HELLO')).toBe(true);
    });
  });
});
