/**
 * FillOrchestrator Tests
 *
 * Tests the complete autofill workflow via the FillKit facade.
 * The FillOrchestrator requires many dependencies, so we test it through
 * the FillKit class with UI disabled for simplicity.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FillKit, CancelableEvent } from '@/index.js';

describe('FillOrchestrator (via FillKit)', () => {
  let fk: FillKit;

  beforeEach(() => {
    fk = new FillKit({
      mode: 'valid',
      ui: { enabled: false },
    });
    document.body.innerHTML = '';
  });

  describe('autofillAll()', () => {
    it('fills fields in a form', async () => {
      document.body.innerHTML = `
        <form id="test-form">
          <input type="text" name="username" />
          <input type="email" name="email" />
          <input type="password" name="password" />
        </form>`;

      await fk.autofillAll();

      const username = document.querySelector(
        'input[name="username"]'
      ) as HTMLInputElement;
      const email = document.querySelector(
        'input[name="email"]'
      ) as HTMLInputElement;
      const password = document.querySelector(
        'input[name="password"]'
      ) as HTMLInputElement;

      expect(username.value).not.toBe('');
      expect(email.value).not.toBe('');
      expect(password.value).not.toBe('');
    });

    it('handles page with no forms gracefully', async () => {
      document.body.innerHTML = '<div>No forms here</div>';

      // Should not throw
      await expect(fk.autofillAll()).resolves.not.toThrow();
    });

    it('fills multiple forms', async () => {
      document.body.innerHTML = `
        <form id="form1">
          <input type="email" name="email1" />
        </form>
        <form id="form2">
          <input type="email" name="email2" />
        </form>`;

      await fk.autofillAll();

      const email1 = document.querySelector(
        'input[name="email1"]'
      ) as HTMLInputElement;
      const email2 = document.querySelector(
        'input[name="email2"]'
      ) as HTMLInputElement;

      expect(email1.value).not.toBe('');
      expect(email2.value).not.toBe('');
    });
  });

  describe('autofill() — single form', () => {
    it('fills only the targeted form', async () => {
      document.body.innerHTML = `
        <form id="target">
          <input type="text" name="name" />
        </form>
        <form id="other">
          <input type="text" name="name2" />
        </form>`;

      const target = document.querySelector('#target') as HTMLFormElement;
      await fk.autofill(target);

      const targetInput = document.querySelector(
        '#target input'
      ) as HTMLInputElement;
      const otherInput = document.querySelector(
        '#other input'
      ) as HTMLInputElement;

      expect(targetInput.value).not.toBe('');
      expect(otherInput.value).toBe('');
    });
  });

  describe('events — beforeScan / afterScan', () => {
    it('fires beforeScan event before scanning', async () => {
      document.body.innerHTML = `
        <form><input type="email" name="email" /></form>`;
      const handler = vi.fn();
      fk.on('beforeScan', handler);

      await fk.autofillAll();

      expect(handler).toHaveBeenCalled();
    });

    it('fires afterScan event after scanning', async () => {
      document.body.innerHTML = `
        <form><input type="email" name="email" /></form>`;
      const handler = vi.fn();
      fk.on('afterScan', handler);

      await fk.autofillAll();

      expect(handler).toHaveBeenCalled();
    });

    it('fires beforeScan before afterScan', async () => {
      document.body.innerHTML = `
        <form><input type="email" name="email" /></form>`;
      const order: string[] = [];
      fk.on('beforeScan', () => {
        order.push('beforeScan');
      });
      fk.on('afterScan', () => {
        order.push('afterScan');
      });

      await fk.autofillAll();

      expect(order.indexOf('beforeScan')).toBeLessThan(
        order.indexOf('afterScan')
      );
    });
  });

  describe('events — beforeFill / afterFill', () => {
    it('fires beforeFill event', async () => {
      document.body.innerHTML = `
        <form><input type="email" name="email" /></form>`;
      const handler = vi.fn();
      fk.on('beforeFill', handler);

      await fk.autofillAll();

      expect(handler).toHaveBeenCalled();
    });

    it('fires afterFill event with result data', async () => {
      document.body.innerHTML = `
        <form><input type="email" name="email" /></form>`;
      const handler = vi.fn();
      fk.on('afterFill', handler);

      await fk.autofillAll();

      expect(handler).toHaveBeenCalled();
      const data = handler.mock.calls[0][0] as Record<string, unknown>;
      expect(data).toHaveProperty('fields');
      expect(data).toHaveProperty('form');
    });
  });

  describe('events — fieldFilled', () => {
    it('fires fieldFilled for each filled field', async () => {
      document.body.innerHTML = `
        <form>
          <input type="email" name="email" />
          <input type="password" name="password" />
        </form>`;
      const handler = vi.fn();
      fk.on('fieldFilled', handler);

      await fk.autofillAll();

      // Should be called for each detected field that was filled
      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('event cancellation', () => {
    it('cancelling beforeScan prevents scanning and filling', async () => {
      document.body.innerHTML = `
        <form><input type="email" name="email" /></form>`;
      fk.on('beforeScan', (_data: unknown, event?: CancelableEvent) => {
        event?.cancel();
      });
      const afterScan = vi.fn();
      fk.on('afterScan', afterScan);

      await fk.autofillAll();

      expect(afterScan).not.toHaveBeenCalled();
      const input = document.querySelector('input') as HTMLInputElement;
      expect(input.value).toBe('');
    });

    it('cancelling beforeFill prevents filling but scan still occurs', async () => {
      document.body.innerHTML = `
        <form><input type="email" name="email" /></form>`;
      fk.on('beforeFill', (_data: unknown, event?: CancelableEvent) => {
        event?.cancel();
      });
      const afterScan = vi.fn();
      fk.on('afterScan', afterScan);
      const fieldFilled = vi.fn();
      fk.on('fieldFilled', fieldFilled);

      await fk.autofillAll();

      // afterScan should still fire (scan happened)
      expect(afterScan).toHaveBeenCalled();
      // But fieldFilled should not fire (fill was cancelled)
      expect(fieldFilled).not.toHaveBeenCalled();
    });
  });

  describe('clear()', () => {
    it('clears all filled fields', async () => {
      document.body.innerHTML = `
        <form>
          <input type="text" name="username" />
          <input type="email" name="email" />
        </form>`;

      await fk.autofillAll();

      const username = document.querySelector(
        'input[name="username"]'
      ) as HTMLInputElement;
      const email = document.querySelector(
        'input[name="email"]'
      ) as HTMLInputElement;

      // Verify fields are filled first
      expect(username.value).not.toBe('');
      expect(email.value).not.toBe('');

      fk.clear();

      expect(username.value).toBe('');
      expect(email.value).toBe('');
    });
  });

  describe('mode: valid vs invalid', () => {
    it('produces filled fields in valid mode', async () => {
      document.body.innerHTML = `
        <form><input type="email" name="email" /></form>`;
      const validFk = new FillKit({
        mode: 'valid',
        ui: { enabled: false },
      });

      await validFk.autofillAll();

      const input = document.querySelector('input') as HTMLInputElement;
      expect(input.value).not.toBe('');
    });

    it('produces filled fields in invalid mode', async () => {
      document.body.innerHTML = `
        <form><input type="email" name="email" /></form>`;
      const invalidFk = new FillKit({
        mode: 'invalid',
        ui: { enabled: false },
      });

      await invalidFk.autofillAll();

      const input = document.querySelector('input') as HTMLInputElement;
      expect(input.value).not.toBe('');
    });
  });

  describe('on() returns unsubscribe function', () => {
    it('removes handler when unsubscribe is called', async () => {
      document.body.innerHTML = `
        <form><input type="email" name="email" /></form>`;
      const handler = vi.fn();
      const unsub = fk.on('beforeScan', handler);

      unsub();

      await fk.autofillAll();
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('data-fillkit-filled tracking', () => {
    it('marks filled fields with data-fillkit-filled attribute', async () => {
      document.body.innerHTML = `
        <form><input type="email" name="email" /></form>`;

      await fk.autofillAll();

      const input = document.querySelector('input') as HTMLInputElement;
      expect(input.hasAttribute('data-fillkit-filled')).toBe(true);
    });
  });

  describe('skips ignored fields', () => {
    it('does not fill fields with data-fillkit-ignore', async () => {
      document.body.innerHTML = `
        <form>
          <input type="email" name="email" />
          <input type="text" name="skip" data-fillkit-ignore />
        </form>`;

      await fk.autofillAll();

      const email = document.querySelector(
        'input[name="email"]'
      ) as HTMLInputElement;
      const skip = document.querySelector(
        'input[name="skip"]'
      ) as HTMLInputElement;

      expect(email.value).not.toBe('');
      expect(skip.value).toBe('');
    });
  });
});
