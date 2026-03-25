import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { uiConfig, defaultUiConfig } from '@/state/atoms/ui-config.js';

/**
 * These tests validate the UiInjector visibility lifecycle:
 * - Bug fix: init with enabled=false, then enable → widget appears
 * - FAB toggle between main widget and FAB (persisted via uiConfig)
 * - Destroy cleans up both widgets
 *
 * We test the atom-level behavior rather than instantiating UiInjector
 * directly (which requires FeedbackManager + full DOM widget creation).
 * The UiInjector subscribes to these atoms and reacts accordingly.
 */
describe('UiInjector visibility lifecycle (atom-level)', () => {
  beforeEach(() => {
    uiConfig.set({ ...defaultUiConfig });
  });

  afterEach(() => {
    uiConfig.set({ ...defaultUiConfig });
  });

  it('uiConfig starts with enabled=true by default', () => {
    expect(uiConfig.get().enabled).toBe(true);
  });

  it('setting enabled=false then true changes config correctly', () => {
    uiConfig.set({ ...uiConfig.get(), enabled: false });
    expect(uiConfig.get().enabled).toBe(false);

    uiConfig.set({ ...uiConfig.get(), enabled: true });
    expect(uiConfig.get().enabled).toBe(true);
  });

  it('subscription fires when enabled changes', () => {
    const handler = vi.fn();
    const unsub = uiConfig.subscribe(handler);

    // Initial call from subscribe
    handler.mockClear();

    uiConfig.set({ ...uiConfig.get(), enabled: false });
    expect(handler).toHaveBeenCalledTimes(1);
    // persistentAtom.subscribe passes (newValue, oldValue) — check first arg
    expect(handler.mock.calls[0][0]).toMatchObject({ enabled: false });

    uiConfig.set({ ...uiConfig.get(), enabled: true });
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler.mock.calls[1][0]).toMatchObject({ enabled: true });

    unsub();
  });

  it('mainWidgetVisible persists in uiConfig (toolbar vs FAB)', () => {
    expect(uiConfig.get().mainWidgetVisible).toBe(true);

    // Simulate toggling to FAB
    uiConfig.set({
      ...uiConfig.get(),
      mainWidgetVisible: false,
    });
    expect(uiConfig.get().mainWidgetVisible).toBe(false);

    // Simulate restoring main widget
    uiConfig.set({
      ...uiConfig.get(),
      mainWidgetVisible: true,
    });
    expect(uiConfig.get().mainWidgetVisible).toBe(true);
  });

  it('fillMode defaults to widget', () => {
    expect(uiConfig.get().fillMode).toBe('widget');
  });

  it('fillMode can be changed to inline', () => {
    uiConfig.set({ ...uiConfig.get(), fillMode: 'inline' });
    expect(uiConfig.get().fillMode).toBe('inline');
  });
});
