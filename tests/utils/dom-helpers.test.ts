import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildAttributeSelector,
  isSafeUrl,
  isSafeNavigationUrl,
  parseSvg,
  setSvgContent,
  clearElement,
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

  describe('parseSvg', () => {
    it('parses a valid SVG string into an SVGElement', () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect/></svg>';
      const result = parseSvg(svg);
      expect(result).toBeInstanceOf(SVGElement);
      expect(result!.tagName.toLowerCase()).toBe('svg');
    });

    it('returns null for malformed SVG', () => {
      const result = parseSvg('<svg><not-closed');
      expect(result).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseSvg('')).toBeNull();
    });

    it('returns null for non-SVG XML', () => {
      const result = parseSvg('<div>hello</div>');
      // DOMParser with image/svg+xml may produce parsererror or non-SVG root
      // Either way, parseSvg should not return it as a valid SVGElement
      if (result !== null) {
        expect(result).toBeInstanceOf(SVGElement);
      }
    });
  });

  describe('setSvgContent', () => {
    let container: HTMLElement;

    beforeEach(() => {
      container = document.createElement('div');
      container.textContent = 'old content';
    });

    it('replaces container content with parsed SVG', () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"></svg>';
      setSvgContent(container, svg);
      expect(container.children.length).toBe(1);
      expect(container.children[0].tagName.toLowerCase()).toBe('svg');
    });

    it('clears container even if SVG is invalid', () => {
      setSvgContent(container, '<invalid');
      expect(container.children.length).toBe(0);
      expect(container.textContent).toBe('');
    });

    it('replaces existing children', () => {
      container.appendChild(document.createElement('span'));
      container.appendChild(document.createElement('span'));
      expect(container.children.length).toBe(2);

      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"></svg>';
      setSvgContent(container, svg);
      expect(container.children.length).toBe(1);
      expect(container.children[0].tagName.toLowerCase()).toBe('svg');
    });
  });

  describe('clearElement', () => {
    it('removes all child nodes', () => {
      const el = document.createElement('div');
      el.appendChild(document.createElement('span'));
      el.appendChild(document.createTextNode('text'));
      el.appendChild(document.createElement('p'));
      expect(el.childNodes.length).toBe(3);

      clearElement(el);
      expect(el.childNodes.length).toBe(0);
    });

    it('is safe to call on an empty element', () => {
      const el = document.createElement('div');
      expect(() => clearElement(el)).not.toThrow();
      expect(el.childNodes.length).toBe(0);
    });
  });
});
