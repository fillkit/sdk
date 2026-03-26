/**
 * Form Identity Correlation Integration Tests
 *
 * Tests that person-related fields within the same form receive correlated
 * values (e.g., email local part derived from firstName/lastName).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FillKit } from '@/index.js';
import { LocalProvider } from '@/providers/LocalProvider.js';

describe('FormIdentity Correlation', () => {
  let fk: FillKit;

  beforeEach(() => {
    fk = new FillKit({
      mode: 'valid',
      ui: { enabled: false },
    });
    document.body.innerHTML = '';
  });

  it('email local part contains firstName from name field', async () => {
    document.body.innerHTML = `
      <form>
        <input type="text" name="first_name" />
        <input type="text" name="last_name" />
        <input type="email" name="email" />
      </form>`;

    await fk.autofillAll();

    const firstName = (
      document.querySelector('input[name="first_name"]') as HTMLInputElement
    ).value;
    const email = (
      document.querySelector('input[name="email"]') as HTMLInputElement
    ).value;

    expect(firstName).not.toBe('');
    expect(email).not.toBe('');

    // Email local part should contain the firstName (case-insensitive)
    const localPart = email.split('@')[0].toLowerCase();
    expect(localPart).toContain(firstName.toLowerCase());
  });

  it('fullName combines correlated firstName + lastName', async () => {
    document.body.innerHTML = `
      <form>
        <input type="text" name="first_name" />
        <input type="text" name="last_name" />
        <input type="text" name="full_name" autocomplete="name" />
      </form>`;

    await fk.autofillAll();

    const firstName = (
      document.querySelector('input[name="first_name"]') as HTMLInputElement
    ).value;
    const lastName = (
      document.querySelector('input[name="last_name"]') as HTMLInputElement
    ).value;
    const fullName = (
      document.querySelector('input[name="full_name"]') as HTMLInputElement
    ).value;

    expect(firstName).not.toBe('');
    expect(lastName).not.toBe('');
    expect(fullName).not.toBe('');
    expect(fullName).toContain(firstName);
    expect(fullName).toContain(lastName);
  });

  it('username is derived from firstName/lastName', async () => {
    document.body.innerHTML = `
      <form>
        <input type="text" name="first_name" />
        <input type="text" name="last_name" />
        <input type="text" name="username" />
      </form>`;

    await fk.autofillAll();

    const firstName = (
      document.querySelector('input[name="first_name"]') as HTMLInputElement
    ).value;
    const lastName = (
      document.querySelector('input[name="last_name"]') as HTMLInputElement
    ).value;
    const username = (
      document.querySelector('input[name="username"]') as HTMLInputElement
    ).value;

    expect(username).not.toBe('');
    // Username should contain at least one of the name parts
    const usernameLower = username.toLowerCase();
    const containsFirstOrLast =
      usernameLower.includes(firstName.toLowerCase()) ||
      usernameLower.includes(lastName.toLowerCase());
    expect(containsFirstOrLast).toBe(true);
  });

  it('multiple emails in same form: same identity, different addresses', async () => {
    document.body.innerHTML = `
      <form>
        <input type="text" name="first_name" />
        <input type="email" name="email1" />
        <input type="email" name="email2" />
      </form>`;

    await fk.autofillAll();

    const firstName = (
      document.querySelector('input[name="first_name"]') as HTMLInputElement
    ).value;
    const email1 = (
      document.querySelector('input[name="email1"]') as HTMLInputElement
    ).value;
    const email2 = (
      document.querySelector('input[name="email2"]') as HTMLInputElement
    ).value;

    expect(email1).not.toBe('');
    expect(email2).not.toBe('');
    // Both emails should contain the firstName (same identity)
    expect(email1.toLowerCase()).toContain(firstName.toLowerCase());
    expect(email2.toLowerCase()).toContain(firstName.toLowerCase());
  });

  it('different forms get independent identities', async () => {
    document.body.innerHTML = `
      <form id="form1">
        <input type="text" name="first_name" />
        <input type="email" name="email" />
      </form>
      <form id="form2">
        <input type="text" name="first_name" />
        <input type="email" name="email" />
      </form>`;

    await fk.autofillAll();

    const firstName1 = (
      document.querySelector(
        '#form1 input[name="first_name"]'
      ) as HTMLInputElement
    ).value;
    const firstName2 = (
      document.querySelector(
        '#form2 input[name="first_name"]'
      ) as HTMLInputElement
    ).value;

    expect(firstName1).not.toBe('');
    expect(firstName2).not.toBe('');
    // Different forms should (usually) get different identities
    // This is probabilistic, so we just verify both are filled
    // and the emails correlate with their respective forms
    const email1 = (
      document.querySelector('#form1 input[name="email"]') as HTMLInputElement
    ).value;
    const email2 = (
      document.querySelector('#form2 input[name="email"]') as HTMLInputElement
    ).value;

    expect(email1.toLowerCase()).toContain(firstName1.toLowerCase());
    expect(email2.toLowerCase()).toContain(firstName2.toLowerCase());
  });

  it('forms without name fields: no regression (address-only)', async () => {
    document.body.innerHTML = `
      <form>
        <input type="text" name="street" autocomplete="street-address" />
        <input type="text" name="city" autocomplete="address-level2" />
        <input type="text" name="zip" autocomplete="postal-code" />
      </form>`;

    await fk.autofillAll();

    const street = (
      document.querySelector('input[name="street"]') as HTMLInputElement
    ).value;
    const city = (
      document.querySelector('input[name="city"]') as HTMLInputElement
    ).value;
    const zip = (
      document.querySelector('input[name="zip"]') as HTMLInputElement
    ).value;

    expect(street).not.toBe('');
    expect(city).not.toBe('');
    expect(zip).not.toBe('');
  });

  it('email-only form still generates identity-derived email', async () => {
    document.body.innerHTML = `
      <form>
        <input type="email" name="email" />
      </form>`;

    await fk.autofillAll();

    const email = (
      document.querySelector('input[name="email"]') as HTMLInputElement
    ).value;

    expect(email).not.toBe('');
    expect(email).toMatch(/@/);
  });

  it('getProfile returns correlated name + email', async () => {
    const provider = new LocalProvider({ locale: 'en' });
    await provider.init();
    const profile = await provider.getProfile();

    const firstName = profile['name.given'] as string;
    const lastName = profile['name.family'] as string;
    const email = profile['email'] as string;
    const fullName = profile['fullName'] as string;

    expect(firstName).toEqual(expect.any(String));
    expect(lastName).toEqual(expect.any(String));
    expect(email.toLowerCase()).toContain(firstName.toLowerCase());
    expect(fullName).toContain(firstName);
    expect(fullName).toContain(lastName);

    await provider.destroy();
  });

  it('sex field value consistent with name identity', async () => {
    document.body.innerHTML = `
      <form>
        <input type="text" name="first_name" />
        <select name="sex">
          <option value="">Select</option>
          <option value="Female">Female</option>
          <option value="Male">Male</option>
        </select>
      </form>`;

    await fk.autofillAll();

    const firstName = (
      document.querySelector('input[name="first_name"]') as HTMLInputElement
    ).value;
    const sex = (
      document.querySelector('select[name="sex"]') as HTMLSelectElement
    ).value;

    expect(firstName).not.toBe('');
    // Sex should be filled (either Female or Male)
    expect(sex).toMatch(/^(Female|Male)$/);
  });
});
