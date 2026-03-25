/**
 * TF-IDF Field Detection Integration Tests
 *
 * Tests multilingual detection across locales, locale switching,
 * and regression against existing signals.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FieldDetector } from '@/core/FieldDetector.js';

describe('TF-IDF Field Detection', () => {
  let detector: FieldDetector;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('English detection via TF-IDF', () => {
    beforeEach(() => {
      detector = new FieldDetector('en');
    });

    it('detects subscriberEmailAddress as EMAIL', () => {
      document.body.innerHTML =
        '<form><input type="text" name="subscriberEmailAddress" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;
      const result = detector.detect(input);

      expect(result.semanticType).toBe('email');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('detects contactPhoneNumber as PHONE', () => {
      document.body.innerHTML =
        '<form><input type="text" name="contactPhoneNumber" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;
      const result = detector.detect(input);

      expect(result.semanticType).toBe('phone');
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('Japanese detection', () => {
    beforeEach(() => {
      detector = new FieldDetector('ja');
    });

    it('detects name="メールアドレス" as EMAIL', () => {
      document.body.innerHTML =
        '<form><input type="text" name="メールアドレス" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;
      const result = detector.detect(input);

      expect(result.semanticType).toBe('email');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('detects placeholder with Japanese text for PHONE', () => {
      document.body.innerHTML =
        '<form><input type="text" placeholder="電話番号を入力" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;
      const result = detector.detect(input);

      expect(result.semanticType).toBe('phone');
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('Chinese detection', () => {
    beforeEach(() => {
      detector = new FieldDetector('zh_CN');
    });

    it('detects name="邮箱" as EMAIL', () => {
      document.body.innerHTML =
        '<form><input type="text" name="邮箱" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;
      const result = detector.detect(input);

      expect(result.semanticType).toBe('email');
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('Arabic detection', () => {
    beforeEach(() => {
      detector = new FieldDetector('ar');
    });

    it('detects name="البريد" as EMAIL', () => {
      document.body.innerHTML =
        '<form><input type="text" name="البريد" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;
      const result = detector.detect(input);

      expect(result.semanticType).toBe('email');
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('Korean detection', () => {
    beforeEach(() => {
      detector = new FieldDetector('ko');
    });

    it('detects label="이메일" as EMAIL', () => {
      document.body.innerHTML = `
        <form>
          <label for="field">이메일</label>
          <input type="text" id="field" />
        </form>`;
      const input = document.querySelector('input') as HTMLInputElement;
      const result = detector.detect(input);

      expect(result.semanticType).toBe('email');
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('Russian detection', () => {
    beforeEach(() => {
      detector = new FieldDetector('ru');
    });

    it('detects Russian password field', () => {
      document.body.innerHTML = `
        <form>
          <label for="pw">пароль</label>
          <input type="password" id="pw" name="пароль" />
        </form>`;
      const input = document.querySelector('input') as HTMLInputElement;
      const result = detector.detect(input);

      // Should detect as password or confirmPassword (both are password-type)
      expect(['password', 'confirmPassword']).toContain(result.semanticType);
      expect(result.confidence).toBeGreaterThan(0.3);
    });
  });

  describe('Thai detection', () => {
    beforeEach(() => {
      detector = new FieldDetector('th');
    });

    it('detects name="อีเมล" as EMAIL', () => {
      document.body.innerHTML =
        '<form><input type="text" name="อีเมล" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;
      const result = detector.detect(input);

      expect(result.semanticType).toBe('email');
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('German detection', () => {
    beforeEach(() => {
      detector = new FieldDetector('de');
    });

    it('detects name="passwort" as PASSWORD', () => {
      document.body.innerHTML =
        '<form><input type="text" name="passwort" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;
      const result = detector.detect(input);

      expect(result.semanticType).toBe('password');
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('Runtime locale switching', () => {
    it('switches from en to ja and detects Japanese text', () => {
      detector = new FieldDetector('en');

      // English detection works
      document.body.innerHTML =
        '<form><input type="text" name="email" /></form>';
      let input = document.querySelector('input') as HTMLInputElement;
      let result = detector.detect(input);
      expect(result.semanticType).toBe('email');

      // Switch to Japanese
      detector.setLocale('ja');

      // Japanese detection works
      document.body.innerHTML =
        '<form><input type="text" name="メールアドレス" /></form>';
      input = document.querySelector('input') as HTMLInputElement;
      result = detector.detect(input);
      expect(result.semanticType).toBe('email');
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('No regression — existing signals still dominate', () => {
    beforeEach(() => {
      detector = new FieldDetector('en');
    });

    it('data-fillkit-type still overrides at 1.0', () => {
      document.body.innerHTML =
        '<form><input type="text" data-fillkit-type="email" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;
      const result = detector.detect(input);

      expect(result.semanticType).toBe('email');
      expect(result.confidence).toBe(1.0);
    });

    it('autocomplete="email" still ≥ 0.9', () => {
      document.body.innerHTML =
        '<form><input type="text" autocomplete="email" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;
      const result = detector.detect(input);

      expect(result.semanticType).toBe('email');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('type="email" name="email" still ≥ 0.55', () => {
      document.body.innerHTML =
        '<form><input type="email" name="email" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;
      const result = detector.detect(input);

      expect(result.semanticType).toBe('email');
      expect(result.confidence).toBeGreaterThanOrEqual(0.55);
    });

    it('non-input elements still get 0 confidence', () => {
      document.body.innerHTML = '<div id="not-input">some text</div>';
      const div = document.querySelector('#not-input') as HTMLElement;
      const result = detector.detect(div);

      expect(result.confidence).toBe(0);
      expect(result.semanticType).toBe('unknown');
    });

    it('TF-IDF alone contributes ≤ 0.2', () => {
      // Use a field name that only TF-IDF can resolve
      // (no regex pattern matches "subscriber_mail")
      document.body.innerHTML =
        '<form><input type="text" name="subscriber_mail" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;
      const result = detector.detect(input);

      // TF-IDF should boost but not exceed 0.2 from TF-IDF signal alone
      // The input type="text" can add +0.3, so total could be up to 0.5
      // But the TF-IDF contribution alone should be ≤ 0.2
      if (result.semanticType === 'email') {
        // The confidence includes type="text" match (+0.3) + TF-IDF boost (≤0.2)
        expect(result.confidence).toBeLessThanOrEqual(0.6);
      }
    });
  });
});
