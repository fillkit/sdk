import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FillKit, type FillKitInstanceMarker } from '@/index.js';

const FILLKIT_INSTANCE_KEY = '__fillkit_instance__';

describe('FillKit instance marker', () => {
  let instance: FillKit | null = null;

  beforeEach(() => {
    // Clean up any leftover markers
    delete (globalThis as Record<string, unknown>)[FILLKIT_INSTANCE_KEY];
  });

  afterEach(async () => {
    if (instance) {
      await instance.destroy();
      instance = null;
    }
  });

  it('sets marker on globalThis during construction', () => {
    instance = new FillKit({ ui: { enabled: false } });

    const marker = (globalThis as Record<string, unknown>)[
      FILLKIT_INSTANCE_KEY
    ] as FillKitInstanceMarker;
    expect(marker).toBeDefined();
    expect(marker.source).toBe('page');
    expect(marker.instance).toBe(instance);
    expect(typeof marker.timestamp).toBe('number');
  });

  it('defaults source to page when _source is not provided', () => {
    instance = new FillKit({ ui: { enabled: false } });

    const marker = (globalThis as Record<string, unknown>)[
      FILLKIT_INSTANCE_KEY
    ] as FillKitInstanceMarker;
    expect(marker.source).toBe('page');
  });

  it('sets source to extension when _source is extension', () => {
    instance = new FillKit({
      ui: { enabled: false },
      _source: 'extension',
    });

    const marker = (globalThis as Record<string, unknown>)[
      FILLKIT_INSTANCE_KEY
    ] as FillKitInstanceMarker;
    expect(marker.source).toBe('extension');
  });

  it('getInstanceInfo returns the marker', () => {
    instance = new FillKit({ ui: { enabled: false } });

    const info = FillKit.getInstanceInfo();
    expect(info).not.toBeNull();
    expect(info?.instance).toBe(instance);
  });

  it('getInstanceInfo returns null when no instance exists', () => {
    const info = FillKit.getInstanceInfo();
    expect(info).toBeNull();
  });

  it('destroy removes the marker', async () => {
    instance = new FillKit({ ui: { enabled: false } });

    expect(FillKit.getInstanceInfo()).not.toBeNull();

    await instance.destroy();
    instance = null;

    expect(FillKit.getInstanceInfo()).toBeNull();
    expect(
      (globalThis as Record<string, unknown>)[FILLKIT_INSTANCE_KEY]
    ).toBeUndefined();
  });

  it('destroy does not remove marker from a different instance', async () => {
    const first = new FillKit({ ui: { enabled: false } });

    // Second instance overwrites the marker
    instance = new FillKit({ ui: { enabled: false } });

    const marker = FillKit.getInstanceInfo();
    expect(marker?.instance).toBe(instance);

    // Destroying the first instance should NOT remove the second's marker
    await first.destroy();
    expect(FillKit.getInstanceInfo()?.instance).toBe(instance);
  });
});
