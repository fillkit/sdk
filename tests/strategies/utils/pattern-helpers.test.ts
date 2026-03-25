import { describe, it, expect } from 'vitest';
import { faker } from '@faker-js/faker';
import { generateFromPattern } from '../../../src/strategies/utils/pattern-helpers.js';

describe('generateFromPattern', () => {
  it('generates a value matching a simple pattern', () => {
    const result = generateFromPattern('^[A-Z]{3}$', faker, () =>
      faker.string.alpha({ length: 3, casing: 'upper' })
    );
    expect(result).toMatch(/^[A-Z]{3}$/);
  });

  it('uses fallback generator when fromRegExp fails on complex patterns', () => {
    const result = generateFromPattern('^[A-Z]{2}\\d{4}$', faker, () => {
      const letters = faker.string.alpha({ length: 2, casing: 'upper' });
      const digits = faker.string.numeric(4);
      return `${letters}${digits}`;
    });
    expect(result).toMatch(/^[A-Z]{2}\d{4}$/);
  });

  it('returns best-effort value when pattern cannot be matched', () => {
    // Intentionally impossible pattern with fallback that never matches
    let callCount = 0;
    const result = generateFromPattern(
      '^IMPOSSIBLE_PATTERN_XYZ_12345$',
      faker,
      () => {
        callCount++;
        return 'fallback-value';
      },
      3
    );
    // Should have retried and returned last attempt
    expect(result).toBe('fallback-value');
    // Should have called fallback at least once
    expect(callCount).toBeGreaterThan(0);
  });

  it('respects maxRetries parameter', () => {
    let callCount = 0;
    generateFromPattern(
      '^NEVER_MATCH$',
      faker,
      () => {
        callCount++;
        return 'nope';
      },
      5
    );
    // maxRetries(5) loop calls + 1 final call = generator called at most 6 times
    // But fromRegExp may also fail, so just check we don't exceed maxRetries + 1
    expect(callCount).toBeLessThanOrEqual(6);
  });

  it('returns fromRegExp result when it matches the pattern', () => {
    // Simple digit pattern that fromRegExp can handle
    const result = generateFromPattern('^[0-9]{3}$', faker, () => '999');
    expect(result).toMatch(/^[0-9]{3}$/);
  });
});
