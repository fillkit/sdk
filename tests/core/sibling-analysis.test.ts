/**
 * Sibling/Position Analysis Tests
 *
 * Tests that the FillOrchestrator refines ambiguous detections by examining
 * nearby sibling field types.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FillKit } from '@/index.js';

describe('Sibling Analysis (via FillKit)', () => {
  let fk: FillKit;

  beforeEach(() => {
    fk = new FillKit({
      mode: 'valid',
      ui: { enabled: false },
    });
    document.body.innerHTML = '';
  });

  it('fills ambiguous name field alongside credit card fields', async () => {
    document.body.innerHTML = `
      <form>
        <input type="text" name="cc_number" autocomplete="cc-number" />
        <input type="text" name="cc_exp" autocomplete="cc-exp" />
        <input type="text" name="cc_csc" autocomplete="cc-csc" />
        <input type="text" name="cardholder" autocomplete="cc-name" />
      </form>`;

    await fk.autofillAll();

    // All fields should be filled
    const ccNumber = document.querySelector(
      'input[name="cc_number"]'
    ) as HTMLInputElement;
    const ccExp = document.querySelector(
      'input[name="cc_exp"]'
    ) as HTMLInputElement;
    const cardholder = document.querySelector(
      'input[name="cardholder"]'
    ) as HTMLInputElement;

    expect(ccNumber.value).not.toBe('');
    expect(ccExp.value).not.toBe('');
    expect(cardholder.value).not.toBe('');
  });

  it('fills all fields in a payment form with mixed types', async () => {
    document.body.innerHTML = `
      <form action="/checkout">
        <input type="text" name="first_name" />
        <input type="text" name="last_name" />
        <input type="email" name="email" />
        <input type="text" autocomplete="cc-number" />
        <input type="text" autocomplete="cc-exp" />
        <input type="text" autocomplete="cc-csc" />
      </form>`;

    await fk.autofillAll();

    const firstName = document.querySelector(
      'input[name="first_name"]'
    ) as HTMLInputElement;
    const email = document.querySelector(
      'input[name="email"]'
    ) as HTMLInputElement;

    expect(firstName.value).not.toBe('');
    expect(email.value).not.toBe('');
  });
});
