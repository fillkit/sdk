/**
 * TF-IDF Scorer Unit Tests
 *
 * Tests the tokenizer (Latin, CJK, Arabic, Cyrillic, Thai) and scorer.
 */

import { describe, it, expect } from 'vitest';
import { tokenize, scoreAll } from '@/utils/tfidf-scorer.js';

describe('tfidf-scorer', () => {
  describe('tokenize()', () => {
    describe('Latin script', () => {
      it('splits camelCase', () => {
        const tokens = tokenize('subscriberMail');
        expect(tokens).toContain('subscriber');
        expect(tokens).toContain('mail');
      });

      it('splits underscores', () => {
        const tokens = tokenize('first_name');
        expect(tokens).toContain('first');
        expect(tokens).toContain('name');
      });

      it('splits hyphens', () => {
        const tokens = tokenize('credit-card');
        expect(tokens).toContain('credit');
        expect(tokens).toContain('card');
      });

      it('splits dots', () => {
        const tokens = tokenize('user.email');
        expect(tokens).toContain('user');
        expect(tokens).toContain('email');
      });

      it('lowercases tokens', () => {
        const tokens = tokenize('EmailAddress');
        expect(tokens).toContain('email');
        expect(tokens).toContain('address');
      });

      it('filters tokens shorter than 2 chars', () => {
        const tokens = tokenize('a_bc_d');
        expect(tokens).not.toContain('a');
        expect(tokens).not.toContain('d');
        expect(tokens).toContain('bc');
      });

      it('returns empty array for empty input', () => {
        expect(tokenize('')).toEqual([]);
      });

      it('deduplicates tokens', () => {
        const tokens = tokenize('name_name');
        expect(tokens.filter(t => t === 'name').length).toBe(1);
      });
    });

    describe('Japanese (CJK)', () => {
      it('keeps katakana sequence as single token', () => {
        const tokens = tokenize('メール');
        expect(tokens).toContain('メール');
      });

      it('keeps kanji as token', () => {
        const tokens = tokenize('電話番号');
        expect(tokens).toContain('電話番号');
      });

      it('splits mixed Latin+Japanese on separators', () => {
        const tokens = tokenize('メール_address');
        expect(tokens).toContain('メール');
        expect(tokens).toContain('address');
      });
    });

    describe('Chinese', () => {
      it('keeps hanzi as single token', () => {
        const tokens = tokenize('邮箱');
        expect(tokens).toContain('邮箱');
      });
    });

    describe('Korean', () => {
      it('keeps hangul as single token', () => {
        const tokens = tokenize('이메일');
        expect(tokens).toContain('이메일');
      });
    });

    describe('Arabic', () => {
      it('keeps RTL word as token', () => {
        const tokens = tokenize('البريد');
        expect(tokens).toContain('البريد');
      });

      it('splits on separators', () => {
        const tokens = tokenize('البريد_email');
        expect(tokens).toContain('البريد');
        expect(tokens).toContain('email');
      });
    });

    describe('Cyrillic', () => {
      it('keeps Cyrillic word as token', () => {
        const tokens = tokenize('пароль');
        expect(tokens).toContain('пароль');
      });
    });

    describe('Thai', () => {
      it('keeps Thai word as token', () => {
        const tokens = tokenize('อีเมล');
        expect(tokens).toContain('อีเมล');
      });
    });
  });

  describe('scoreAll()', () => {
    it('returns high EMAIL score for email tokens in English', () => {
      const scores = scoreAll(['email'], 'en');
      expect(scores.has('email')).toBe(true);
      expect(scores.get('email')!).toBeGreaterThan(0.1);
    });

    it('detects メール as EMAIL in Japanese locale', () => {
      const scores = scoreAll(['メール'], 'ja');
      expect(scores.has('email')).toBe(true);
      expect(scores.get('email')!).toBeGreaterThan(0.1);
    });

    it('detects Arabic phone token', () => {
      const scores = scoreAll(['هاتف'], 'ar');
      expect(scores.has('phone')).toBe(true);
      expect(scores.get('phone')!).toBeGreaterThan(0.1);
    });

    it('returns empty map for unknown tokens', () => {
      const scores = scoreAll(['xyznonexistent'], 'en');
      expect(scores.size).toBe(0);
    });

    it('falls back to English for unknown locale', () => {
      const scores = scoreAll(['email'], 'xyz_unknown');
      expect(scores.has('email')).toBe(true);
    });

    it('falls back to base language for regional locale', () => {
      const scores = scoreAll(['email'], 'ja_JP');
      // Falls back to 'ja'
      expect(scores.size).toBeGreaterThan(0);
    });

    it('respects minScore option', () => {
      const highThreshold = scoreAll(['email'], 'en', {
        minScore: 0.99,
      });
      const lowThreshold = scoreAll(['email'], 'en', {
        minScore: 0.01,
      });
      expect(lowThreshold.size).toBeGreaterThanOrEqual(highThreshold.size);
    });

    it('respects maxResults option', () => {
      const limited = scoreAll(['name'], 'en', {
        maxResults: 2,
        minScore: 0.01,
      });
      expect(limited.size).toBeLessThanOrEqual(2);
    });

    it('returns all scores in 0.0-1.0 range', () => {
      const scores = scoreAll(['email', 'address', 'phone'], 'en', {
        minScore: 0.01,
        maxResults: 50,
      });
      for (const [, score] of scores) {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1.0);
      }
    });

    it('returns empty map for empty tokens', () => {
      const scores = scoreAll([], 'en');
      expect(scores.size).toBe(0);
    });

    it('matches CJK substrings (e.g., メールアドレス contains メール)', () => {
      const scores = scoreAll(['メールアドレス'], 'ja');
      expect(scores.has('email')).toBe(true);
      expect(scores.get('email')!).toBeGreaterThan(0.1);
    });

    it('does not penalize longer field names', () => {
      const shortScore = scoreAll(['email'], 'en');
      const longScore = scoreAll(
        ['subscriber', 'email', 'address', 'field'],
        'en'
      );
      // Both should detect email with reasonable confidence
      expect(shortScore.has('email')).toBe(true);
      expect(longScore.has('email')).toBe(true);
      // Longer name should not score dramatically lower
      expect(longScore.get('email')!).toBeGreaterThan(
        shortScore.get('email')! * 0.5
      );
    });
  });
});
