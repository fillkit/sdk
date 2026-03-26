/**
 * FormIdentityFactory Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { createFormIdentity } from '@/core/FormIdentityFactory.js';
import { faker } from '@faker-js/faker';
import type { FieldDetection } from '@/core/FieldDetector.js';

function makeDetection(semanticType: string): FieldDetection {
  return {
    semanticType,
    confidence: 0.9,
    constraints: {},
    descriptor: {} as FieldDetection['descriptor'],
    element: document.createElement('input'),
    metadata: null,
  };
}

describe('createFormIdentity', () => {
  it('returns undefined for forms without person-related fields', () => {
    const cache = new Map<HTMLElement, FieldDetection>();
    cache.set(document.createElement('input'), makeDetection('address.line1'));
    cache.set(document.createElement('input'), makeDetection('phone'));

    const result = createFormIdentity(cache, faker);
    expect(result).toBeUndefined();
  });

  it('returns identity with firstName/lastName when email field exists', () => {
    const cache = new Map<HTMLElement, FieldDetection>();
    cache.set(document.createElement('input'), makeDetection('email'));

    const result = createFormIdentity(cache, faker);
    expect(result).toBeDefined();
    expect(result!.firstName).toEqual(expect.any(String));
    expect(result!.lastName).toEqual(expect.any(String));
    expect(result!.firstName.length).toBeGreaterThan(0);
    expect(result!.lastName.length).toBeGreaterThan(0);
  });

  it('includes sex when sex field is detected', () => {
    const cache = new Map<HTMLElement, FieldDetection>();
    cache.set(document.createElement('input'), makeDetection('name.given'));
    cache.set(document.createElement('input'), makeDetection('sex'));

    const result = createFormIdentity(cache, faker);
    expect(result).toBeDefined();
    expect(result!.sex).toMatch(/^(female|male)$/);
  });

  it('includes sex when gender field is detected', () => {
    const cache = new Map<HTMLElement, FieldDetection>();
    cache.set(document.createElement('input'), makeDetection('gender'));

    const result = createFormIdentity(cache, faker);
    expect(result).toBeDefined();
    expect(result!.sex).toMatch(/^(female|male)$/);
  });

  it('omits sex when no sex/gender field detected', () => {
    const cache = new Map<HTMLElement, FieldDetection>();
    cache.set(document.createElement('input'), makeDetection('email'));

    const result = createFormIdentity(cache, faker);
    expect(result).toBeDefined();
    expect(result!.sex).toBeUndefined();
  });

  it('returned identity is frozen (immutable)', () => {
    const cache = new Map<HTMLElement, FieldDetection>();
    cache.set(document.createElement('input'), makeDetection('name.given'));

    const result = createFormIdentity(cache, faker);
    expect(result).toBeDefined();
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('returns identity when username field exists', () => {
    const cache = new Map<HTMLElement, FieldDetection>();
    cache.set(document.createElement('input'), makeDetection('username'));

    const result = createFormIdentity(cache, faker);
    expect(result).toBeDefined();
    expect(result!.firstName).toEqual(expect.any(String));
  });

  it('returns identity when displayName field exists', () => {
    const cache = new Map<HTMLElement, FieldDetection>();
    cache.set(document.createElement('input'), makeDetection('displayName'));

    const result = createFormIdentity(cache, faker);
    expect(result).toBeDefined();
  });
});
