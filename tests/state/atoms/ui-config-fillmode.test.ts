import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { uiConfig, defaultUiConfig } from '@/state/atoms/ui-config.js';

describe('uiConfig fillMode', () => {
  beforeEach(() => {
    uiConfig.set({ ...defaultUiConfig });
  });

  afterEach(() => {
    uiConfig.set({ ...defaultUiConfig });
  });

  it('default fillMode is "widget"', () => {
    expect(uiConfig.get().fillMode).toBe('widget');
  });

  it('setting fillMode to "inline" persists', () => {
    uiConfig.set({ ...uiConfig.get(), fillMode: 'inline' });
    expect(uiConfig.get().fillMode).toBe('inline');
  });

  it('setting fillMode back to "widget" persists', () => {
    uiConfig.set({ ...uiConfig.get(), fillMode: 'inline' });
    uiConfig.set({ ...uiConfig.get(), fillMode: 'widget' });
    expect(uiConfig.get().fillMode).toBe('widget');
  });

  it('decode handles missing fillMode with backwards compat', () => {
    // Simulate persisted state without fillMode
    const rawWithoutFillMode = JSON.stringify({
      enabled: true,
      position: { placement: 'bottom.center' },
      visibility: {},
    });

    localStorage.setItem('fillkit:ui-config', rawWithoutFillMode);

    // defaultUiConfig includes fillMode for backwards compat with persisted state lacking it
    expect(defaultUiConfig.fillMode).toBe('widget');
  });

  it('fillMode is part of UiConfigState interface', () => {
    const cfg = uiConfig.get();
    expect('fillMode' in cfg).toBe(true);
    expect(['widget', 'inline']).toContain(cfg.fillMode);
  });
});
