/**
 * Value Deduplication Tests
 *
 * Tests that multiple fields with the same semantic type get unique values.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FillKit } from '@/index.js';

describe('Value Deduplication', () => {
  let fk: FillKit;

  beforeEach(() => {
    fk = new FillKit({
      mode: 'valid',
      ui: { enabled: false },
    });
    document.body.innerHTML = '';
  });

  it('fills two name.given fields with different values', async () => {
    document.body.innerHTML = `
      <form>
        <input type="text" name="first_name" />
        <input type="text" name="given_name" />
      </form>`;

    await fk.autofillAll();

    const first = document.querySelector(
      'input[name="first_name"]'
    ) as HTMLInputElement;
    const second = document.querySelector(
      'input[name="given_name"]'
    ) as HTMLInputElement;

    expect(first.value).not.toBe('');
    expect(second.value).not.toBe('');
    // Both detected as name.given but should get different values
    expect(first.value).not.toBe(second.value);
  });

  it('fills two email fields with different values', async () => {
    document.body.innerHTML = `
      <form>
        <input type="email" name="email1" />
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
    expect(email1.value).not.toBe(email2.value);
  });
});
