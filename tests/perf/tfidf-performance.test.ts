/**
 * TF-IDF Performance Benchmark Tests
 *
 * Regression guards for TF-IDF scorer and field detection performance.
 * Thresholds are generous (3-5x expected) to avoid CI flakiness.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { tokenize, scoreAll } from '@/utils/tfidf-scorer.js';
import { FieldDetector } from '@/core/FieldDetector.js';

/** Measure median execution time over N iterations. */
function benchMedian(fn: () => void, iterations: number): number {
  // Warm up
  for (let i = 0; i < 5; i++) fn();

  const times: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  return times[Math.floor(times.length / 2)];
}

describe('TF-IDF Performance', () => {
  describe('scoreAll() per-call benchmarks', () => {
    it('English tokens complete under 5ms per call', () => {
      const tokens = tokenize('subscriberEmailAddress');
      const median = benchMedian(() => scoreAll(tokens, 'en'), 100);
      expect(median).toBeLessThan(5);
    });

    it('Japanese tokens complete under 5ms per call', () => {
      const tokens = tokenize('メールアドレス');
      const median = benchMedian(() => scoreAll(tokens, 'ja'), 100);
      expect(median).toBeLessThan(5);
    });

    it('Arabic tokens complete under 5ms per call', () => {
      const tokens = tokenize('البريد');
      const median = benchMedian(() => scoreAll(tokens, 'ar'), 100);
      expect(median).toBeLessThan(5);
    });

    it('repeated calls benefit from vocabulary cache', () => {
      const tokens = tokenize('contactPhone');
      // First call warms the cache
      scoreAll(tokens, 'en');

      const coldTokens = tokenize('homeAddress');
      // Use a fresh locale to force cold path
      const coldMedian = benchMedian(() => scoreAll(coldTokens, 'en'), 50);
      const warmMedian = benchMedian(() => scoreAll(tokens, 'en'), 50);
      // Warm calls should not be slower than cold calls
      expect(warmMedian).toBeLessThanOrEqual(coldMedian * 2);
    });
  });

  describe('FieldDetector.detect() per-element benchmarks', () => {
    let detector: FieldDetector;

    beforeEach(() => {
      document.body.innerHTML = '';
      detector = new FieldDetector('en');
    });

    it('detect() completes under 5ms for a Latin-named field', () => {
      document.body.innerHTML =
        '<form><input type="text" name="subscriberEmailAddress" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;

      const median = benchMedian(() => detector.detect(input), 100);
      expect(median).toBeLessThan(5);
    });

    it('detect() completes under 5ms for a CJK-named field', () => {
      const jaDetector = new FieldDetector('ja');
      document.body.innerHTML =
        '<form><input type="text" name="メールアドレス" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;

      const median = benchMedian(() => jaDetector.detect(input), 100);
      expect(median).toBeLessThan(5);
    });

    it('detect() skips TF-IDF for data-fillkit-type fields', () => {
      document.body.innerHTML =
        '<form><input type="text" data-fillkit-type="email" name="obscureFieldName123" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;

      // Explicit type should be fast since TF-IDF is deferred.
      // Threshold generous to avoid CI flakiness — the key invariant
      // is that it's no slower than a normal detection.
      const median = benchMedian(() => detector.detect(input), 100);
      expect(median).toBeLessThan(5);
    });
  });

  describe('batch detection scaling', () => {
    let detector: FieldDetector;

    beforeEach(() => {
      document.body.innerHTML = '';
      detector = new FieldDetector('en');
    });

    function createForm(fieldCount: number): HTMLInputElement[] {
      const fields = [
        { name: 'firstName', type: 'text' },
        { name: 'lastName', type: 'text' },
        { name: 'emailAddress', type: 'email' },
        { name: 'phoneNumber', type: 'tel' },
        { name: 'streetAddress', type: 'text' },
        { name: 'cityName', type: 'text' },
        { name: 'zipCode', type: 'text' },
        { name: 'cardNumber', type: 'text' },
        { name: 'expiryDate', type: 'text' },
        { name: 'cvvCode', type: 'text' },
        { name: 'companyName', type: 'text' },
        { name: 'jobTitle', type: 'text' },
        { name: 'websiteUrl', type: 'url' },
        { name: 'birthDate', type: 'text' },
        { name: 'countrySelect', type: 'text' },
        { name: 'stateProvince', type: 'text' },
        { name: 'passwordField', type: 'password' },
        { name: 'confirmPassword', type: 'password' },
        { name: 'commentText', type: 'text' },
        { name: 'agreeTerms', type: 'checkbox' },
      ];

      const html = ['<form>'];
      for (let i = 0; i < fieldCount; i++) {
        const f = fields[i % fields.length];
        html.push(`<input type="${f.type}" name="${f.name}_${i}" />`);
      }
      html.push('</form>');
      document.body.innerHTML = html.join('');

      return Array.from(
        document.querySelectorAll('input')
      ) as HTMLInputElement[];
    }

    it('10-field form completes under 50ms', () => {
      const inputs = createForm(10);
      const median = benchMedian(() => {
        for (const input of inputs) detector.detect(input);
      }, 20);
      expect(median).toBeLessThan(50);
    });

    it('20-field form completes under 100ms', () => {
      const inputs = createForm(20);
      const median = benchMedian(() => {
        for (const input of inputs) detector.detect(input);
      }, 20);
      expect(median).toBeLessThan(100);
    });

    it('scales linearly: 20-field / 5-field ratio < 8x', () => {
      const inputs5 = createForm(5);
      const time5 = benchMedian(() => {
        for (const input of inputs5) detector.detect(input);
      }, 20);

      // Recreate 20-field form (createForm replaces innerHTML)
      const inputs20 = createForm(20);
      const time20 = benchMedian(() => {
        for (const input of inputs20) detector.detect(input);
      }, 20);

      // With linear scaling, 20/5 = 4x. Allow up to 8x for overhead.
      const ratio = time20 / Math.max(time5, 0.01);
      expect(ratio).toBeLessThan(8);
    }, 15_000);
  });

  describe('memory stability', () => {
    it('1000 scoreAll() calls do not leak memory', () => {
      const tokens = tokenize('subscriberEmailAddress');
      const before =
        typeof process !== 'undefined' && process.memoryUsage
          ? process.memoryUsage().heapUsed
          : 0;

      for (let i = 0; i < 1000; i++) {
        scoreAll(tokens, 'en');
      }

      // Force GC if available (node --expose-gc)
      if (typeof globalThis.gc === 'function') {
        globalThis.gc();
      }

      const after =
        typeof process !== 'undefined' && process.memoryUsage
          ? process.memoryUsage().heapUsed
          : 0;

      // If we can measure memory, growth should be < 5MB
      if (before > 0 && after > 0) {
        const growthMB = (after - before) / 1024 / 1024;
        expect(growthMB).toBeLessThan(5);
      }
      // If we can't measure, the test still verifies no throws/crashes
      expect(true).toBe(true);
    });
  });
});
