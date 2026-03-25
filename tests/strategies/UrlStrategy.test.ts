import { describe, it, expect } from 'vitest';
import { UrlStrategy } from '../../src/strategies/UrlStrategy.js';
import { faker } from '@faker-js/faker';

describe('UrlStrategy', () => {
  const strategy = new UrlStrategy();

  describe('valid mode - displayName', () => {
    it('should generate display name via faker.internet.displayName()', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'displayName',
        faker,
      });
      expect(result.length).toBeGreaterThan(0);
      expect(typeof result).toBe('string');
    });
  });

  describe('valid mode - userAgent', () => {
    it('should generate user agent string', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'userAgent',
        faker,
      });
      expect(result.length).toBeGreaterThan(5);
      // User agent strings contain a product token with a version (e.g., "Mozilla/5.0" or "Googlebot/2.1")
      expect(result).toMatch(/\//i);
    });
  });

  describe('valid mode - url', () => {
    it('should generate a valid URL', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'url',
        faker,
      });
      expect(() => new URL(result)).not.toThrow();
    });
  });

  describe('valid mode - website', () => {
    it('should generate a website URL with www', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'website',
        faker,
      });
      expect(result).toMatch(/^https:\/\/www\./);
    });
  });

  describe('valid mode - domain', () => {
    it('should generate a domain name', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'domain',
        faker,
      });
      expect(result).toMatch(/\./);
      expect(result).not.toContain('://');
    });
  });

  describe('invalid mode', () => {
    it('should generate an invalid URL', () => {
      const result = strategy.generate({ mode: 'invalid', faker });
      expect(typeof result).toBe('string');
    });
  });
});
