import { describe, it, expect } from 'vitest';
import { TextStrategy } from '../../src/strategies/TextStrategy.js';
import { faker } from '@faker-js/faker';

describe('TextStrategy', () => {
  const strategy = new TextStrategy();

  describe('valid mode - bio', () => {
    it('should generate bio via faker.person.bio()', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'bio',
        faker,
      });
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('valid mode - about', () => {
    it('should generate about text via faker.person.bio()', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'about',
        faker,
      });
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('valid mode - description', () => {
    it('should generate product description', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'description',
        faker,
      });
      expect(result.length).toBeGreaterThan(10);
    });
  });

  describe('valid mode - default short text', () => {
    it('should use natural English words instead of lorem', () => {
      const result = strategy.generate({
        mode: 'valid',
        faker,
        constraints: { maxlength: 50 },
      });
      expect(result.length).toBeGreaterThan(0);
      // Natural English words should not contain lorem-style text
      expect(result).not.toMatch(/^lorem$/i);
    });
  });

  describe('valid mode - company', () => {
    it('should generate company name', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'company',
        faker,
      });
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('valid mode - username', () => {
    it('should generate username', () => {
      const result = strategy.generate({
        mode: 'valid',
        fieldType: 'username',
        faker,
      });
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('invalid mode', () => {
    it('should generate invalid text', () => {
      const result = strategy.generate({ mode: 'invalid', faker });
      expect(typeof result).toBe('string');
    });
  });
});
