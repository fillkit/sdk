/**
 * Autocomplete & Inputmode Detection Tests
 *
 * Tests that HTML autocomplete and inputmode attributes are used as
 * detection signals by FieldDetector.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FieldDetector } from '@/core/FieldDetector.js';

describe('FieldDetector — autocomplete attribute detection', () => {
  let detector: FieldDetector;

  beforeEach(() => {
    detector = new FieldDetector('en');
    document.body.innerHTML = '';
  });

  describe('basic autocomplete tokens', () => {
    const cases: Array<{ autocomplete: string; expectedType: string }> = [
      { autocomplete: 'given-name', expectedType: 'name.given' },
      { autocomplete: 'family-name', expectedType: 'name.family' },
      { autocomplete: 'name', expectedType: 'fullName' },
      { autocomplete: 'email', expectedType: 'email' },
      { autocomplete: 'tel', expectedType: 'phone' },
      { autocomplete: 'street-address', expectedType: 'address.line1' },
      { autocomplete: 'address-line1', expectedType: 'address.line1' },
      { autocomplete: 'address-line2', expectedType: 'address.line2' },
      { autocomplete: 'address-level2', expectedType: 'city' },
      { autocomplete: 'address-level1', expectedType: 'state' },
      { autocomplete: 'postal-code', expectedType: 'postalCode' },
      { autocomplete: 'country-name', expectedType: 'country' },
      { autocomplete: 'country', expectedType: 'country' },
      { autocomplete: 'bday', expectedType: 'birthDate' },
      { autocomplete: 'sex', expectedType: 'sex' },
      { autocomplete: 'username', expectedType: 'username' },
      { autocomplete: 'new-password', expectedType: 'password' },
      { autocomplete: 'current-password', expectedType: 'password' },
      { autocomplete: 'cc-number', expectedType: 'creditCard.number' },
      { autocomplete: 'cc-exp', expectedType: 'creditCard.expiry' },
      { autocomplete: 'cc-csc', expectedType: 'creditCard.cvv' },
      { autocomplete: 'organization', expectedType: 'company' },
      { autocomplete: 'url', expectedType: 'url' },
      { autocomplete: 'language', expectedType: 'language' },
    ];

    for (const { autocomplete, expectedType } of cases) {
      it(`maps autocomplete="${autocomplete}" to ${expectedType}`, () => {
        document.body.innerHTML = `
          <form><input type="text" autocomplete="${autocomplete}" /></form>`;
        const input = document.querySelector('input') as HTMLInputElement;
        const result = detector.detect(input);

        expect(result.semanticType).toBe(expectedType);
        expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      });
    }
  });

  describe('compound autocomplete tokens', () => {
    it('strips shipping prefix from "shipping street-address"', () => {
      document.body.innerHTML = `
        <form><input type="text" autocomplete="shipping street-address" /></form>`;
      const input = document.querySelector('input') as HTMLInputElement;
      const result = detector.detect(input);

      expect(result.semanticType).toBe('address.line1');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('strips billing prefix from "billing postal-code"', () => {
      document.body.innerHTML = `
        <form><input type="text" autocomplete="billing postal-code" /></form>`;
      const input = document.querySelector('input') as HTMLInputElement;
      const result = detector.detect(input);

      expect(result.semanticType).toBe('postalCode');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('strips section prefix from "section-main email"', () => {
      document.body.innerHTML = `
        <form><input type="text" autocomplete="section-main email" /></form>`;
      const input = document.querySelector('input') as HTMLInputElement;
      const result = detector.detect(input);

      expect(result.semanticType).toBe('email');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe('autocomplete "on" and "off" are ignored', () => {
    it('autocomplete="on" does not boost confidence', () => {
      document.body.innerHTML = `
        <form><input type="text" autocomplete="on" /></form>`;
      const input = document.querySelector('input') as HTMLInputElement;
      const result = detector.detect(input);

      // Should not match any specific type from autocomplete alone
      // (may still match from input type="text")
      if (result.semanticType !== 'unknown') {
        expect(result.confidence).toBeLessThan(0.9);
      }
    });

    it('autocomplete="off" does not boost confidence', () => {
      document.body.innerHTML = `
        <form><input type="text" autocomplete="off" /></form>`;
      const input = document.querySelector('input') as HTMLInputElement;
      const result = detector.detect(input);

      if (result.semanticType !== 'unknown') {
        expect(result.confidence).toBeLessThan(0.9);
      }
    });
  });

  describe('autocomplete alone drives detection', () => {
    it('detects email with only autocomplete (no name/id/placeholder)', () => {
      document.body.innerHTML = `
        <form><input type="text" autocomplete="email" /></form>`;
      const input = document.querySelector('input') as HTMLInputElement;
      const result = detector.detect(input);

      expect(result.semanticType).toBe('email');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });
  });
});

describe('FieldDetector — inputmode attribute detection', () => {
  let detector: FieldDetector;

  beforeEach(() => {
    detector = new FieldDetector('en');
    document.body.innerHTML = '';
  });

  it('inputmode="email" boosts email detection', () => {
    document.body.innerHTML = `
      <form><input type="text" name="user_email" inputmode="email" /></form>`;
    const input = document.querySelector('input') as HTMLInputElement;
    const result = detector.detect(input);

    expect(result.semanticType).toBe('email');
    // name pattern (0.25) + inputmode (0.15) + input type text (0.3) = 0.7
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it('inputmode="tel" boosts phone detection', () => {
    document.body.innerHTML = `
      <form><input type="text" name="phone" inputmode="tel" /></form>`;
    const input = document.querySelector('input') as HTMLInputElement;
    const result = detector.detect(input);

    expect(result.semanticType).toBe('phone');
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it('inputmode="numeric" boosts postal code detection', () => {
    document.body.innerHTML = `
      <form><input type="text" name="postal_code" inputmode="numeric" /></form>`;
    const input = document.querySelector('input') as HTMLInputElement;
    const result = detector.detect(input);

    expect(result.semanticType).toBe('postalCode');
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it('inputmode="decimal" boosts latitude detection', () => {
    document.body.innerHTML = `
      <form><input type="text" name="latitude" inputmode="decimal" /></form>`;
    const input = document.querySelector('input') as HTMLInputElement;
    const result = detector.detect(input);

    expect(result.semanticType).toBe('latitude');
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it('inputmode="url" boosts url detection', () => {
    document.body.innerHTML = `
      <form><input type="text" name="website" inputmode="url" /></form>`;
    const input = document.querySelector('input') as HTMLInputElement;
    const result = detector.detect(input);

    expect(result.semanticType).toBe('website');
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
  });
});
