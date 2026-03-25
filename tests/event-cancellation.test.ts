/**
 * Event Cancellation Tests
 *
 * Tests the event cancellation capability for FillKit SDK
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FillKit, CancelableEvent } from '../src/index.js';

describe('Event Cancellation', () => {
  let fk: FillKit;

  beforeEach(() => {
    // Create a fresh FillKit instance for each test
    fk = new FillKit({
      mode: 'valid',
      ui: { enabled: false },
    });

    // Setup a simple form in the document
    document.body.innerHTML = `
      <form id="test-form">
        <input type="text" name="username" />
        <input type="email" name="email" />
        <input type="password" name="password" />
      </form>
    `;
  });

  describe('CancelableEvent', () => {
    it('should create a CancelableEvent with canceled = false by default', () => {
      const event = new CancelableEvent();
      expect(event.canceled).toBe(false);
    });

    it('should set canceled to true when cancel() is called', () => {
      const event = new CancelableEvent();
      event.cancel();
      expect(event.canceled).toBe(true);
    });

    it('should keep canceled = true after multiple cancel() calls', () => {
      const event = new CancelableEvent();
      event.cancel();
      event.cancel();
      expect(event.canceled).toBe(true);
    });
  });

  describe('Event Handler Signature', () => {
    it('should call event handler with data and CancelableEvent', async () => {
      const handler = vi.fn();
      fk.on('beforeScan', handler);

      await fk.autofillAll();

      expect(handler).toHaveBeenCalled();
      const call = handler.mock.calls[0];
      expect(call.length).toBe(2);
      expect(call[1]).toBeInstanceOf(CancelableEvent);
    });

    it('should allow handlers without event parameter (backward compatibility)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const handler = vi.fn((_data: unknown) => {
        // Handler only uses data, ignores event
      });
      fk.on('beforeScan', handler);

      await fk.autofillAll();

      expect(handler).toHaveBeenCalled();
      expect(() => handler.mock.calls[0]).not.toThrow();
    });
  });

  describe('beforeScan Cancellation', () => {
    it('should cancel entire scan when beforeScan event is canceled', async () => {
      const beforeScanHandler = vi.fn(
        (_data: unknown, event?: CancelableEvent) => {
          event?.cancel();
        }
      );
      const afterScanHandler = vi.fn();

      fk.on('beforeScan', beforeScanHandler);
      fk.on('afterScan', afterScanHandler);

      await fk.autofillAll();

      expect(beforeScanHandler).toHaveBeenCalled();
      expect(afterScanHandler).not.toHaveBeenCalled();
    });

    it('should not cancel scan when beforeScan event is not canceled', async () => {
      const beforeScanHandler = vi.fn();
      const afterScanHandler = vi.fn();

      fk.on('beforeScan', beforeScanHandler);
      fk.on('afterScan', afterScanHandler);

      await fk.autofillAll();

      expect(beforeScanHandler).toHaveBeenCalled();
      expect(afterScanHandler).toHaveBeenCalled();
    });
  });

  describe('beforeFill Cancellation', () => {
    it('should cancel fill operation when beforeFill event is canceled', async () => {
      const beforeFillHandler = vi.fn(
        (_data: unknown, event?: CancelableEvent) => {
          event?.cancel();
        }
      );
      const fieldFilledHandler = vi.fn();

      fk.on('beforeFill', beforeFillHandler);
      fk.on('fieldFilled', fieldFilledHandler);

      await fk.autofillAll();

      expect(beforeFillHandler).toHaveBeenCalled();
      expect(fieldFilledHandler).not.toHaveBeenCalled();
    });

    it('should proceed with fill when beforeFill event is not canceled', async () => {
      const beforeFillHandler = vi.fn();
      const fieldFilledHandler = vi.fn();

      fk.on('beforeFill', beforeFillHandler);
      fk.on('fieldFilled', fieldFilledHandler);

      await fk.autofillAll();

      expect(beforeFillHandler).toHaveBeenCalled();
      expect(fieldFilledHandler).toHaveBeenCalled();
    });
  });

  describe('beforeApplyValue Cancellation', () => {
    it('should cancel specific field fill when beforeApplyValue is canceled', async () => {
      let passwordFieldCanceled = false;
      const beforeApplyValueHandler = vi.fn(
        (data: unknown, event?: CancelableEvent) => {
          // Cancel password fields only
          const d = data as Record<string, unknown>;
          if (d.semanticType === 'password') {
            event?.cancel();
            passwordFieldCanceled = true;
          }
        }
      );

      fk.on('beforeApplyValue', beforeApplyValueHandler);

      const form = document.getElementById('test-form') as HTMLFormElement;
      await fk.autofill(form);

      // beforeApplyValue should have been called for each field
      expect(beforeApplyValueHandler).toHaveBeenCalled();

      // Password field should not be filled
      const passwordInput = document.querySelector(
        'input[name="password"]'
      ) as HTMLInputElement;
      expect(passwordInput.value).toBe('');
      expect(passwordFieldCanceled).toBe(true);

      // Other fields should be filled
      const usernameInput = document.querySelector(
        'input[name="username"]'
      ) as HTMLInputElement;
      expect(usernameInput.value).not.toBe('');
    });

    it('should fill all fields when beforeApplyValue is not canceled', async () => {
      const beforeApplyValueHandler = vi.fn();

      fk.on('beforeApplyValue', beforeApplyValueHandler);

      const form = document.getElementById('test-form') as HTMLFormElement;
      await fk.autofill(form);

      // All fields should be filled
      const usernameInput = document.querySelector(
        'input[name="username"]'
      ) as HTMLInputElement;
      const emailInput = document.querySelector(
        'input[name="email"]'
      ) as HTMLInputElement;
      const passwordInput = document.querySelector(
        'input[name="password"]'
      ) as HTMLInputElement;

      expect(usernameInput.value).not.toBe('');
      expect(emailInput.value).not.toBe('');
      expect(passwordInput.value).not.toBe('');
    });
  });

  describe('Async Event Handlers', () => {
    it('should support async event handlers', async () => {
      const asyncHandler = vi.fn(
        async (_data: unknown, event?: CancelableEvent) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          event?.cancel();
        }
      );

      fk.on('beforeScan', asyncHandler);

      const afterScanHandler = vi.fn();
      fk.on('afterScan', afterScanHandler);

      await fk.autofillAll();

      expect(asyncHandler).toHaveBeenCalled();
      expect(afterScanHandler).not.toHaveBeenCalled();
    });
  });

  describe('Multiple Handlers', () => {
    it('should stop processing handlers after first cancellation', async () => {
      const handler1 = vi.fn((_data: unknown, event?: CancelableEvent) => {
        event?.cancel();
      });
      const handler2 = vi.fn();

      fk.on('beforeScan', handler1);
      fk.on('beforeScan', handler2);

      await fk.autofillAll();

      expect(handler1).toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should process all handlers when none cancel', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      fk.on('beforeScan', handler1);
      fk.on('beforeScan', handler2);
      fk.on('beforeScan', handler3);

      await fk.autofillAll();

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
      expect(handler3).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should continue processing even if handler throws error', async () => {
      const throwingHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const normalHandler = vi.fn();

      fk.on('beforeScan', throwingHandler);
      fk.on('afterScan', normalHandler);

      // Should not throw
      await expect(fk.autofillAll()).resolves.not.toThrow();

      expect(throwingHandler).toHaveBeenCalled();
      expect(normalHandler).toHaveBeenCalled();
    });
  });
});
