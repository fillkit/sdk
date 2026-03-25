import { describe, it, expect } from 'vitest';
import { AnimalStrategy } from '@/strategies/AnimalStrategy.js';
import type { ValueOptions } from '@/types/index.js';

describe('AnimalStrategy', () => {
  const strategy = new AnimalStrategy();

  const makeOptions = (
    fieldType: string,
    mode: 'valid' | 'invalid' = 'valid'
  ): ValueOptions =>
    ({
      fieldType,
      mode,
    }) as ValueOptions;

  describe('valid mode', () => {
    it('generates an animal type', () => {
      const result = strategy.generate(makeOptions('animalType'));
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('generates a pet name', () => {
      const result = strategy.generate(makeOptions('petName'));
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('generates a dog breed', () => {
      const result = strategy.generate(makeOptions('dogBreed'));
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('generates a cat breed', () => {
      const result = strategy.generate(makeOptions('catBreed'));
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('defaults to animal type for unknown fieldType', () => {
      const result = strategy.generate(makeOptions('unknown'));
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('invalid mode', () => {
    it('returns an invalid value', () => {
      const result = strategy.generate(makeOptions('animalType', 'invalid'));
      expect(['', '12345', 'InvalidAnimal']).toContain(result);
    });
  });

  describe('uniqueness', () => {
    it('can generate multiple different animal types', () => {
      const results = new Set<string>();
      for (let i = 0; i < 20; i++) {
        results.add(strategy.generate(makeOptions('animalType')));
      }
      expect(results.size).toBeGreaterThan(1);
    });
  });
});
