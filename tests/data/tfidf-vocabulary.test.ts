/**
 * TF-IDF Vocabulary Validation Tests
 *
 * Validates the generated vocabulary data for completeness,
 * weight bounds, and script-specific token presence.
 */

import { describe, it, expect } from 'vitest';
import {
  TFIDF_VOCABULARY,
  VOCABULARY_LOCALES,
  VOCABULARY_META,
} from '@/data/tfidf-vocabulary.js';

describe('TFIDF_VOCABULARY', () => {
  it('contains all expected locales', () => {
    // At least 50 locales (52 locale patterns + en)
    expect(Object.keys(TFIDF_VOCABULARY).length).toBeGreaterThanOrEqual(50);
  });

  it('has English vocabulary', () => {
    expect(TFIDF_VOCABULARY['en']).toBeDefined();
  });

  it('English vocabulary has entries for common field types', () => {
    const en = TFIDF_VOCABULARY['en'];
    const commonTypes = [
      'email',
      'phone',
      'password',
      'fullName',
      'name.given',
      'name.family',
      'company',
      'city',
    ];
    for (const type of commonTypes) {
      expect(en[type]).toBeDefined();
      expect(Object.keys(en[type]).length).toBeGreaterThan(0);
    }
  });

  it('all weights are strictly 0 < w ≤ 1.0', { timeout: 30000 }, () => {
    for (const locale of Object.keys(TFIDF_VOCABULARY)) {
      for (const fieldType of Object.keys(TFIDF_VOCABULARY[locale])) {
        for (const [, weight] of Object.entries(
          TFIDF_VOCABULARY[locale][fieldType]
        )) {
          expect(weight).toBeGreaterThan(0);
          expect(weight).toBeLessThanOrEqual(1.0);
        }
      }
    }
  });

  it('Japanese vocabulary contains CJK tokens', () => {
    const ja = TFIDF_VOCABULARY['ja'];
    expect(ja).toBeDefined();

    // Collect all tokens from the Japanese vocabulary
    const allTokens = new Set<string>();
    for (const fieldType of Object.keys(ja)) {
      for (const token of Object.keys(ja[fieldType])) {
        allTokens.add(token);
      }
    }

    // Check for CJK characters (U+3000-U+9FFF range)
    const cjkPattern = /[\u3000-\u9FFF]/;
    const hasCJK = [...allTokens].some(t => cjkPattern.test(t));
    expect(hasCJK).toBe(true);
  });

  it('Arabic vocabulary contains Arabic script tokens', () => {
    const ar = TFIDF_VOCABULARY['ar'];
    expect(ar).toBeDefined();

    const allTokens = new Set<string>();
    for (const fieldType of Object.keys(ar)) {
      for (const token of Object.keys(ar[fieldType])) {
        allTokens.add(token);
      }
    }

    const arabicPattern = /[\u0600-\u06FF]/;
    const hasArabic = [...allTokens].some(t => arabicPattern.test(t));
    expect(hasArabic).toBe(true);
  });

  it('Russian vocabulary contains Cyrillic tokens', () => {
    const ru = TFIDF_VOCABULARY['ru'];
    expect(ru).toBeDefined();

    const allTokens = new Set<string>();
    for (const fieldType of Object.keys(ru)) {
      for (const token of Object.keys(ru[fieldType])) {
        allTokens.add(token);
      }
    }

    const cyrillicPattern = /[\u0400-\u04FF]/;
    const hasCyrillic = [...allTokens].some(t => cyrillicPattern.test(t));
    expect(hasCyrillic).toBe(true);
  });
});

describe('VOCABULARY_LOCALES', () => {
  it('matches the locales in TFIDF_VOCABULARY', () => {
    const vocabLocales = Object.keys(TFIDF_VOCABULARY).sort();
    const declaredLocales = [...VOCABULARY_LOCALES].sort();
    expect(declaredLocales).toEqual(vocabLocales);
  });

  it('includes key locales', () => {
    expect(VOCABULARY_LOCALES).toContain('en');
    expect(VOCABULARY_LOCALES).toContain('ja');
    expect(VOCABULARY_LOCALES).toContain('ar');
    expect(VOCABULARY_LOCALES).toContain('ru');
    expect(VOCABULARY_LOCALES).toContain('de');
    expect(VOCABULARY_LOCALES).toContain('zh_CN');
  });
});

describe('VOCABULARY_META', () => {
  it('has correct structure', () => {
    expect(VOCABULARY_META).toHaveProperty('generatedAt');
    expect(VOCABULARY_META).toHaveProperty('localeCount');
    expect(VOCABULARY_META).toHaveProperty('totalFieldTypes');
    expect(VOCABULARY_META).toHaveProperty('version');
  });

  it('has valid counts', () => {
    expect(VOCABULARY_META.localeCount).toBeGreaterThanOrEqual(50);
    expect(VOCABULARY_META.totalFieldTypes).toBeGreaterThanOrEqual(100);
  });

  it('has a valid ISO date', () => {
    const date = new Date(VOCABULARY_META.generatedAt);
    expect(date.getTime()).not.toBeNaN();
  });
});
