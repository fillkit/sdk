import { describe, it, expect } from 'vitest';
import { ImageStrategy } from '../../src/strategies/ImageStrategy.js';
import { faker } from '@faker-js/faker';

describe('ImageStrategy', () => {
  const strategy = new ImageStrategy();

  describe('valid mode', () => {
    it('should generate an image URL', () => {
      const result = strategy.generate({ mode: 'valid', faker });
      expect(result).toMatch(/^https?:\/\//);
    });

    it('should produce diverse URLs', () => {
      const urls = new Set<string>();
      for (let i = 0; i < 20; i++) {
        urls.add(strategy.generate({ mode: 'valid', faker }));
      }
      expect(urls.size).toBeGreaterThan(3);
    });
  });

  describe('invalid mode', () => {
    it('should generate an invalid image value', () => {
      const result = strategy.generate({ mode: 'invalid', faker });
      expect(typeof result).toBe('string');
    });
  });

  describe('validate', () => {
    it('should accept valid http(s) URL', () => {
      expect(strategy.validate('https://example.com/img.jpg')).toBe(true);
    });

    it('should reject javascript: URLs', () => {
      expect(strategy.validate('javascript:alert(1)')).toBe(false);
    });

    it('should reject non-URL strings', () => {
      expect(strategy.validate('not-a-url')).toBe(false);
    });
  });
});
