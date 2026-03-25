import { describe, it, expect } from 'vitest';
import { FileStrategy } from '../../src/strategies/FileStrategy.js';
import { faker } from '@faker-js/faker';

describe('FileStrategy', () => {
  const strategy = new FileStrategy();

  describe('valid mode', () => {
    it('should generate a filename or path', () => {
      const result = strategy.generate({ mode: 'valid', faker });
      expect(result).not.toBeNull();
      expect(typeof result).toBe('string');
      expect((result as string).length).toBeGreaterThan(0);
    });

    it('should produce diverse filenames', () => {
      const files = new Set<string>();
      for (let i = 0; i < 20; i++) {
        const f = strategy.generate({ mode: 'valid', faker });
        if (f) files.add(f);
      }
      expect(files.size).toBeGreaterThan(5);
    });
  });

  describe('valid mode - file input element', () => {
    it('should return null for actual file inputs', () => {
      const mockElement = document.createElement('input');
      mockElement.type = 'file';
      const result = strategy.generate({
        mode: 'valid',
        faker,
        element: mockElement,
      });
      expect(result).toBeNull();
    });
  });

  describe('invalid mode', () => {
    it('should generate an invalid/dangerous filename', () => {
      const result = strategy.generate({ mode: 'invalid', faker });
      expect(typeof result).toBe('string');
    });
  });
});
