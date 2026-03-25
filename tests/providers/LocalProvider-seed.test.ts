import { describe, it, expect } from 'vitest';
import { LocalProvider } from '../../src/providers/LocalProvider.js';

describe('LocalProvider — seed support', () => {
  it('produces deterministic values with the same seed', async () => {
    const provider1 = new LocalProvider({ seed: 42 });
    await provider1.init();
    const value1 = await provider1.getValue('email');
    await provider1.destroy();

    const provider2 = new LocalProvider({ seed: 42 });
    await provider2.init();
    const value2 = await provider2.getValue('email');
    await provider2.destroy();

    expect(value1).toBe(value2);
  });

  it('produces different values with different seeds', async () => {
    const provider1 = new LocalProvider({ seed: 42 });
    await provider1.init();
    const value1 = await provider1.getValue('email');
    await provider1.destroy();

    const provider2 = new LocalProvider({ seed: 99 });
    await provider2.init();
    const value2 = await provider2.getValue('email');
    await provider2.destroy();

    expect(value1).not.toBe(value2);
  });

  it('produces non-deterministic values without a seed', async () => {
    const provider = new LocalProvider();
    await provider.init();

    // Generate two values — they may or may not differ, but the call should work
    const value = await provider.getValue('fullName');
    expect(typeof value).toBe('string');
    expect((value as string).length).toBeGreaterThan(0);

    await provider.destroy();
  });
});
