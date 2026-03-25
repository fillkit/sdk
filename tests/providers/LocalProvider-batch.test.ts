import { describe, it, expect } from 'vitest';
import { LocalProvider } from '../../src/providers/LocalProvider.js';

describe('LocalProvider — getBatchValues', () => {
  it('returns the requested number of values', async () => {
    const provider = new LocalProvider();
    await provider.init();

    const values = await provider.getBatchValues('fullName', 5);
    expect(values).toHaveLength(5);
    values.forEach(v => {
      expect(typeof v).toBe('string');
      expect((v as string).length).toBeGreaterThan(0);
    });

    await provider.destroy();
  });

  it('returns unique values when possible', async () => {
    const provider = new LocalProvider();
    await provider.init();

    const values = await provider.getBatchValues('email', 5);
    const unique = new Set(values);
    expect(unique.size).toBe(5);

    await provider.destroy();
  });

  it('works with a single value request', async () => {
    const provider = new LocalProvider();
    await provider.init();

    const values = await provider.getBatchValues('phone', 1);
    expect(values).toHaveLength(1);
    expect(values[0]).not.toBeNull();

    await provider.destroy();
  });

  it('respects locale option', async () => {
    const provider = new LocalProvider({ locale: 'de' });
    await provider.init();

    const values = await provider.getBatchValues('fullName', 3, {
      locale: 'de',
    });
    expect(values).toHaveLength(3);
    values.forEach(v => {
      expect(typeof v).toBe('string');
    });

    await provider.destroy();
  });
});
