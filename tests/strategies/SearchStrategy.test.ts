import { describe, it, expect } from 'vitest';
import { SearchStrategy } from '../../src/strategies/SearchStrategy.js';
import { faker } from '@faker-js/faker';

describe('SearchStrategy', () => {
  const strategy = new SearchStrategy();

  describe('valid mode', () => {
    it('should generate a search query string', () => {
      const result = strategy.generate({ mode: 'valid', faker });
      expect(result.length).toBeGreaterThan(0);
      expect(typeof result).toBe('string');
    });

    it('should produce diverse queries', () => {
      const queries = new Set<string>();
      for (let i = 0; i < 20; i++) {
        queries.add(strategy.generate({ mode: 'valid', faker }));
      }
      expect(queries.size).toBeGreaterThan(5);
    });

    it('should respect maxlength constraint', () => {
      const result = strategy.generate({
        mode: 'valid',
        faker,
        constraints: { maxlength: 10 },
      });
      expect(result.length).toBeLessThanOrEqual(10);
    });
  });

  describe('invalid mode', () => {
    it('should generate attack-style search input', () => {
      const result = strategy.generate({ mode: 'invalid', faker });
      expect(typeof result).toBe('string');
    });
  });
});
