import { describe, it, expect } from 'vitest';
import { BookStrategy } from '@/strategies/BookStrategy.js';
import type { ValueOptions } from '@/types/index.js';

describe('BookStrategy', () => {
  const strategy = new BookStrategy();

  const makeOptions = (
    fieldType: string,
    mode: 'valid' | 'invalid' = 'valid'
  ): ValueOptions =>
    ({
      fieldType,
      mode,
    }) as ValueOptions;

  describe('valid mode', () => {
    it('generates a book title', () => {
      const result = strategy.generate(makeOptions('bookTitle'));
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('generates a book author', () => {
      const result = strategy.generate(makeOptions('bookAuthor'));
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('generates a book genre', () => {
      const result = strategy.generate(makeOptions('bookGenre'));
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('generates a book publisher', () => {
      const result = strategy.generate(makeOptions('bookPublisher'));
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('defaults to book title for unknown fieldType', () => {
      const result = strategy.generate(makeOptions('unknown'));
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('invalid mode', () => {
    it('returns an invalid value', () => {
      const result = strategy.generate(makeOptions('bookTitle', 'invalid'));
      expect(['', '12345', 'N/A']).toContain(result);
    });
  });

  describe('uniqueness', () => {
    it('can generate multiple different titles', () => {
      const results = new Set<string>();
      for (let i = 0; i < 20; i++) {
        results.add(strategy.generate(makeOptions('bookTitle')));
      }
      expect(results.size).toBeGreaterThan(1);
    });
  });
});
