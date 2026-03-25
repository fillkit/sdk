import { describe, it, expect } from 'vitest';
import { DevToolsStrategy } from '@/strategies/DevToolsStrategy.js';
import type { ValueOptions } from '@/types/index.js';

describe('DevToolsStrategy', () => {
  const strategy = new DevToolsStrategy();

  const makeOptions = (
    fieldType: string,
    mode: 'valid' | 'invalid' = 'valid'
  ): ValueOptions =>
    ({
      fieldType,
      mode,
    }) as ValueOptions;

  describe('valid mode', () => {
    it('generates a MongoDB ObjectId', () => {
      const result = strategy.generate(makeOptions('mongodbId'));
      expect(typeof result).toBe('string');
      // MongoDB ObjectId is 24 hex characters
      expect(result).toMatch(/^[0-9a-f]{24}$/);
    });

    it('generates a commit SHA', () => {
      const result = strategy.generate(makeOptions('commitSha'));
      expect(typeof result).toBe('string');
      // Git SHA is 40 hex characters
      expect(result).toMatch(/^[0-9a-f]+$/);
    });

    it('generates a git branch name', () => {
      const result = strategy.generate(makeOptions('gitBranch'));
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('generates a commit message', () => {
      const result = strategy.generate(makeOptions('commitMessage'));
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('generates a database column name', () => {
      const result = strategy.generate(makeOptions('databaseColumn'));
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('generates a database type', () => {
      const result = strategy.generate(makeOptions('databaseType'));
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('generates a database engine', () => {
      const result = strategy.generate(makeOptions('databaseEngine'));
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('defaults to MongoDB ObjectId for unknown fieldType', () => {
      const result = strategy.generate(makeOptions('unknown'));
      expect(result).toMatch(/^[0-9a-f]{24}$/);
    });
  });

  describe('invalid mode', () => {
    it('returns an invalid value', () => {
      const result = strategy.generate(makeOptions('mongodbId', 'invalid'));
      expect(['', 'not-a-valid-id', '!!invalid!!']).toContain(result);
    });
  });

  describe('uniqueness', () => {
    it('can generate multiple different MongoDB IDs', () => {
      const results = new Set<string>();
      for (let i = 0; i < 20; i++) {
        results.add(strategy.generate(makeOptions('mongodbId')));
      }
      expect(results.size).toBeGreaterThan(1);
    });
  });
});
