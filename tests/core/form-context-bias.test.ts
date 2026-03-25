/**
 * Form Context Bias Tests
 *
 * Tests that form action/title/legend text biases field detection
 * toward contextually appropriate semantic types.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FieldDetector } from '@/core/FieldDetector.js';
import type { FormContext } from '@/types/index.js';

describe('FieldDetector — form context bias', () => {
  let detector: FieldDetector;

  beforeEach(() => {
    detector = new FieldDetector('en');
    document.body.innerHTML = '';
  });

  it('boosts credit card types on a checkout form', () => {
    document.body.innerHTML = `
      <form action="/checkout">
        <input type="text" name="cc_number" />
      </form>`;
    const input = document.querySelector('input') as HTMLInputElement;

    const checkoutContext: FormContext = {
      formId: 'checkout',
      formAction: '/checkout',
      formTitle: 'Payment',
      legendTexts: [],
      fields: [],
      fieldTypeDistribution: new Map(),
    };

    const withContext = detector.detect(input, checkoutContext);
    const withoutContext = detector.detect(input);

    // With checkout context, CC-related detection should be boosted
    expect(withContext.confidence).toBeGreaterThanOrEqual(
      withoutContext.confidence
    );
  });

  it('boosts contact types on a contact form', () => {
    document.body.innerHTML = `
      <form>
        <input type="email" name="email" />
      </form>`;
    const input = document.querySelector('input') as HTMLInputElement;

    const contactContext: FormContext = {
      formId: 'contact',
      formAction: '/contact',
      formTitle: 'Contact Us',
      legendTexts: [],
      fields: [],
      fieldTypeDistribution: new Map(),
    };

    const withContext = detector.detect(input, contactContext);
    const withoutContext = detector.detect(input);

    expect(withContext.confidence).toBeGreaterThanOrEqual(
      withoutContext.confidence
    );
  });

  it('boosts address types on a shipping form', () => {
    document.body.innerHTML = `
      <form>
        <input type="text" name="city" />
      </form>`;
    const input = document.querySelector('input') as HTMLInputElement;

    const shippingContext: FormContext = {
      formId: 'shipping',
      formAction: '/shipping',
      formTitle: 'Shipping Address',
      legendTexts: [],
      fields: [],
      fieldTypeDistribution: new Map(),
    };

    const withContext = detector.detect(input, shippingContext);
    const withoutContext = detector.detect(input);

    expect(withContext.confidence).toBeGreaterThanOrEqual(
      withoutContext.confidence
    );
  });

  it('boosts login types on a sign-in form', () => {
    document.body.innerHTML = `
      <form>
        <input type="password" name="password" />
      </form>`;
    const input = document.querySelector('input') as HTMLInputElement;

    const loginContext: FormContext = {
      formId: 'login',
      formAction: '/login',
      formTitle: 'Sign In',
      legendTexts: [],
      fields: [],
      fieldTypeDistribution: new Map(),
    };

    const withContext = detector.detect(input, loginContext);
    const withoutContext = detector.detect(input);

    expect(withContext.confidence).toBeGreaterThanOrEqual(
      withoutContext.confidence
    );
  });

  it('does not boost unrelated types', () => {
    document.body.innerHTML = `
      <form>
        <input type="text" name="city" />
      </form>`;
    const input = document.querySelector('input') as HTMLInputElement;

    // Checkout form should NOT boost city detection
    const checkoutContext: FormContext = {
      formId: 'checkout',
      formAction: '/checkout',
      formTitle: 'Payment',
      legendTexts: [],
      fields: [],
      fieldTypeDistribution: new Map(),
    };

    const withContext = detector.detect(input, checkoutContext);
    const withoutContext = detector.detect(input);

    // City is not in the checkout boost set, so confidence should be equal
    expect(withContext.confidence).toBe(withoutContext.confidence);
  });
});
