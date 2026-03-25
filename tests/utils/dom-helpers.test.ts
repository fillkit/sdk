import { describe, it, expect } from 'vitest';
import {
  buildAttributeSelector,
  isSafeUrl,
  isSafeNavigationUrl,
} from '../../src/utils/dom-helpers.js';

describe('dom-helpers', () => {
  describe('buildAttributeSelector', () => {
    it('builds a basic attribute selector', () => {
      const result = buildAttributeSelector('name', 'email');
      expect(result).toBe('[name="email"]');
    });

    it('escapes special CSS characters in values', () => {
      const result = buildAttributeSelector('for', 'my.field');
      // The dot should be escaped
      expect(result).toContain('my\\.field');
    });

    it('escapes quotes in values', () => {
      const result = buildAttributeSelector('name', 'field"name');
      // The quote should be escaped
      expect(result).toContain('field\\"name');
    });

    it('escapes selector injection attempts', () => {
      const result = buildAttributeSelector('name', '"] + * { display: none }');
      // The dangerous characters should be escaped, preventing breakout
      expect(result).not.toContain('"] + *');
      expect(result).toMatch(/^\[name="/);
    });
  });

  describe('isSafeUrl', () => {
    it('accepts https URLs', () => {
      expect(isSafeUrl('https://example.com')).toBe(true);
    });

    it('accepts http URLs', () => {
      expect(isSafeUrl('http://example.com')).toBe(true);
    });

    it('rejects javascript: URLs', () => {
      expect(isSafeUrl('javascript:alert(1)')).toBe(false);
    });

    it('rejects data: URLs', () => {
      expect(isSafeUrl('data:text/html,<h1>test</h1>')).toBe(false);
    });

    it('rejects blob: URLs', () => {
      expect(isSafeUrl('blob:https://example.com/uuid')).toBe(false);
    });

    it('rejects ftp: URLs', () => {
      expect(isSafeUrl('ftp://example.com')).toBe(false);
    });

    it('rejects invalid URLs', () => {
      expect(isSafeUrl('not-a-url')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(isSafeUrl('')).toBe(false);
    });
  });

  describe('isSafeNavigationUrl', () => {
    it('accepts https URLs', () => {
      expect(isSafeNavigationUrl('https://example.com')).toBe(true);
    });

    it('accepts http URLs', () => {
      expect(isSafeNavigationUrl('http://example.com')).toBe(true);
    });

    it('accepts relative URLs', () => {
      expect(isSafeNavigationUrl('/page')).toBe(true);
    });

    it('rejects javascript: URLs', () => {
      expect(isSafeNavigationUrl('javascript:alert(1)')).toBe(false);
    });

    it('rejects data: URLs', () => {
      expect(isSafeNavigationUrl('data:text/html,<h1>hi</h1>')).toBe(false);
    });

    it('rejects blob: URLs', () => {
      expect(isSafeNavigationUrl('blob:https://example.com/id')).toBe(false);
    });

    it('rejects vbscript: URLs', () => {
      expect(isSafeNavigationUrl('vbscript:msgbox')).toBe(false);
    });
  });
});
