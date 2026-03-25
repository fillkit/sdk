import { describe, it, expect } from 'vitest';
import { MusicStrategy } from '@/strategies/MusicStrategy.js';
import type { ValueOptions } from '@/types/index.js';

describe('MusicStrategy', () => {
  const strategy = new MusicStrategy();

  const makeOptions = (
    fieldType: string,
    mode: 'valid' | 'invalid' = 'valid'
  ): ValueOptions =>
    ({
      fieldType,
      mode,
    }) as ValueOptions;

  describe('valid mode', () => {
    it('generates a music genre', () => {
      const result = strategy.generate(makeOptions('musicGenre'));
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('generates a song name', () => {
      const result = strategy.generate(makeOptions('songName'));
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('generates a music artist', () => {
      const result = strategy.generate(makeOptions('musicArtist'));
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('defaults to music genre for unknown fieldType', () => {
      const result = strategy.generate(makeOptions('unknown'));
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('invalid mode', () => {
    it('returns an invalid value', () => {
      const result = strategy.generate(makeOptions('musicGenre', 'invalid'));
      expect(['', '12345', 'N/A']).toContain(result);
    });
  });

  describe('uniqueness', () => {
    it('can generate multiple different genres', () => {
      const results = new Set<string>();
      for (let i = 0; i < 20; i++) {
        results.add(strategy.generate(makeOptions('musicGenre')));
      }
      expect(results.size).toBeGreaterThan(1);
    });
  });
});
