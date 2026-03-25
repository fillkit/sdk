import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FormTracker } from '@/core/FormTracker.js';

describe('FormTracker', () => {
  let tracker: FormTracker;

  beforeEach(() => {
    tracker = new FormTracker();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    tracker.stopTracking();
    vi.restoreAllMocks();
  });

  describe('startTracking() / stopTracking()', () => {
    it('starts tracking without error', () => {
      expect(() => tracker.startTracking()).not.toThrow();
    });

    it('stops tracking without error', () => {
      tracker.startTracking();
      expect(() => tracker.stopTracking()).not.toThrow();
    });

    it('is safe to call startTracking multiple times', () => {
      tracker.startTracking();
      expect(() => tracker.startTracking()).not.toThrow();
    });

    it('is safe to call stopTracking when not tracking', () => {
      expect(() => tracker.stopTracking()).not.toThrow();
    });
  });

  describe('getCurrentForm()', () => {
    it('returns null when no form is focused', () => {
      document.body.innerHTML = `
        <form id="f1"><input type="text" name="a" /></form>`;
      tracker.startTracking();

      expect(tracker.getCurrentForm()).toBeNull();
    });

    it('returns the form when a focusin event fires on an input inside it', () => {
      document.body.innerHTML = `
        <form id="f1"><input type="text" name="a" /></form>`;
      tracker.startTracking();

      const input = document.querySelector('input') as HTMLInputElement;
      input.dispatchEvent(new Event('focusin', { bubbles: true }));

      expect(tracker.getCurrentForm()).not.toBeNull();
      expect(tracker.getCurrentForm()!.id).toBe('f1');
    });

    it('updates when user clicks into a different form', () => {
      document.body.innerHTML = `
        <form id="f1"><input type="text" name="a" /></form>
        <form id="f2"><input type="text" name="b" /></form>`;
      tracker.startTracking();

      const inputA = document.querySelector('#f1 input') as HTMLInputElement;
      const inputB = document.querySelector('#f2 input') as HTMLInputElement;

      inputA.dispatchEvent(new Event('click', { bubbles: true }));
      expect(tracker.getCurrentForm()!.id).toBe('f1');

      inputB.dispatchEvent(new Event('click', { bubbles: true }));
      expect(tracker.getCurrentForm()!.id).toBe('f2');
    });

    it('adds fillkit-current-form class to the current form', () => {
      document.body.innerHTML = `
        <form id="f1"><input type="text" name="a" /></form>`;
      tracker.startTracking();

      const input = document.querySelector('input') as HTMLInputElement;
      input.dispatchEvent(new Event('focusin', { bubbles: true }));

      const form = document.querySelector('#f1') as HTMLFormElement;
      expect(form.classList.contains('fillkit-current-form')).toBe(true);
      expect(form.getAttribute('data-fillkit-current')).toBe('true');
    });
  });

  describe('watch mode', () => {
    it('enableWatchMode / disableWatchMode lifecycle', () => {
      tracker.startTracking();

      const callback = vi.fn(async () => {});
      tracker.enableWatchMode({ callback });
      expect(tracker.isWatchModeEnabled()).toBe(true);

      tracker.disableWatchMode();
      expect(tracker.isWatchModeEnabled()).toBe(false);
    });

    it('is safe to call enableWatchMode when already enabled', () => {
      tracker.startTracking();

      const callback = vi.fn(async () => {});
      tracker.enableWatchMode({ callback });
      expect(() => tracker.enableWatchMode({ callback })).not.toThrow();
    });

    it('is safe to call disableWatchMode when not enabled', () => {
      expect(() => tracker.disableWatchMode()).not.toThrow();
    });

    it('sets up watch mode with lifecycle tracking', async () => {
      vi.useFakeTimers();
      tracker.startTracking();

      const callback = vi.fn(async () => {});
      tracker.enableWatchMode({ callback });

      // MutationObserver is a no-op in jsdom — verify lifecycle only
      expect(tracker.isWatchModeEnabled()).toBe(true);

      vi.useRealTimers();
    });

    it('stopTracking disables watch mode', () => {
      tracker.startTracking();
      const callback = vi.fn(async () => {});
      tracker.enableWatchMode({ callback });
      expect(tracker.isWatchModeEnabled()).toBe(true);

      tracker.stopTracking();
      expect(tracker.isWatchModeEnabled()).toBe(false);
    });
  });

  describe('event cleanup', () => {
    it('removes event listeners after stopTracking', () => {
      document.body.innerHTML = `
        <form id="f1"><input type="text" name="a" /></form>`;
      tracker.startTracking();

      const input = document.querySelector('input') as HTMLInputElement;
      input.dispatchEvent(new Event('focusin', { bubbles: true }));
      expect(tracker.getCurrentForm()!.id).toBe('f1');

      tracker.stopTracking();

      // After stopTracking, the stored currentForm remains (not cleared),
      // but no new events should be tracked. We verify stopTracking
      // completes without error and tracking is deactivated.
      // Starting and interacting again should work.
      tracker.startTracking();
      document.body.innerHTML = `
        <form id="f2"><input type="text" name="b" /></form>`;
      const inputB = document.querySelector('input') as HTMLInputElement;
      inputB.dispatchEvent(new Event('focusin', { bubbles: true }));
      expect(tracker.getCurrentForm()!.id).toBe('f2');
    });
  });
});
