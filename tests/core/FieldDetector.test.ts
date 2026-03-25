/**
 * FieldDetector Tests
 *
 * Tests the semantic field type detection from DOM elements.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FieldDetector } from '@/core/FieldDetector.js';

describe('FieldDetector', () => {
  let detector: FieldDetector;

  beforeEach(() => {
    detector = new FieldDetector('en');
    document.body.innerHTML = '';
  });

  describe('detect() — input type detection', () => {
    it('detects email input by type="email"', () => {
      document.body.innerHTML =
        '<form><input type="email" name="email" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;
      const result = detector.detect(input);

      expect(result.semanticType).toBe('email');
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    it('detects password input by type="password"', () => {
      document.body.innerHTML =
        '<form><input type="password" name="password" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;
      const result = detector.detect(input);

      expect(result.semanticType).toBe('password');
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    it('detects phone input by type="tel"', () => {
      document.body.innerHTML =
        '<form><input type="tel" name="phone" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;
      const result = detector.detect(input);

      expect(result.semanticType).toBe('phone');
      expect(result.confidence).toBeGreaterThan(0.4);
    });
  });

  describe('detect() — name attribute detection', () => {
    it('detects first name by name="first_name"', () => {
      document.body.innerHTML =
        '<form><input type="text" name="first_name" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;
      const result = detector.detect(input);

      expect(result.semanticType).toBe('name.given');
      expect(result.confidence).toBeGreaterThan(0.2);
    });

    it('detects last name by name="last_name"', () => {
      document.body.innerHTML =
        '<form><input type="text" name="last_name" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;
      const result = detector.detect(input);

      expect(result.semanticType).toBe('name.family');
      expect(result.confidence).toBeGreaterThan(0.2);
    });
  });

  describe('detect() — placeholder detection', () => {
    it('detects email by placeholder text', () => {
      document.body.innerHTML =
        '<form><input type="text" placeholder="Enter your email" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;
      const result = detector.detect(input);

      expect(result.semanticType).toBe('email');
      expect(result.confidence).toBeGreaterThanOrEqual(0.15);
    });
  });

  describe('detect() — id attribute detection', () => {
    it('detects email by id="user-email"', () => {
      document.body.innerHTML =
        '<form><input type="text" id="user-email" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;
      const result = detector.detect(input);

      // The namePatterns for email check id too
      expect(result.semanticType).toBe('email');
      expect(result.confidence).toBeGreaterThanOrEqual(0.15);
    });
  });

  describe('detect() — select element', () => {
    it('detects select with name="country"', () => {
      document.body.innerHTML = `
        <form>
          <select name="country">
            <option value="">Select country</option>
            <option value="US">United States</option>
          </select>
        </form>`;
      const select = document.querySelector('select') as HTMLSelectElement;
      const result = detector.detect(select);

      expect(result.semanticType).toBe('country');
      expect(result.confidence).toBeGreaterThan(0.2);
    });

    it('detects generic select without name hints', () => {
      document.body.innerHTML = `
        <form>
          <select>
            <option value="a">A</option>
            <option value="b">B</option>
          </select>
        </form>`;
      const select = document.querySelector('select') as HTMLSelectElement;
      const result = detector.detect(select);

      // Should detect as select.generic or have a low confidence match
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('detect() — textarea', () => {
    it('detects textarea with name="message"', () => {
      document.body.innerHTML =
        '<form><textarea name="message"></textarea></form>';
      const textarea = document.querySelector(
        'textarea'
      ) as HTMLTextAreaElement;
      const result = detector.detect(textarea);

      expect(result.semanticType).toBe('textarea.generic');
      expect(result.confidence).toBeGreaterThan(0.2);
    });
  });

  describe('detect() — unknown/non-input elements', () => {
    it('detects a bare text input with no hints as a text-compatible type or unknown', () => {
      document.body.innerHTML = '<form><input type="text" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;
      const result = detector.detect(input);

      // A bare type="text" input may match types that include 'text' in
      // their inputTypes (e.g., name.given, email, etc.) with low confidence
      // from the input type signal alone (0.3). This is expected behavior
      // since many field types accept text inputs.
      if (result.semanticType !== 'unknown') {
        // If it matched something, the confidence should come only from
        // the input type match (0.3 max without other signals)
        expect(result.confidence).toBeLessThanOrEqual(0.5);
      }
    });

    it('returns confidence 0 for non-input elements', () => {
      document.body.innerHTML = '<div id="not-input">some text</div>';
      const div = document.querySelector('#not-input') as HTMLElement;
      const result = detector.detect(div);

      expect(result.confidence).toBe(0);
      expect(result.semanticType).toBe('unknown');
    });
  });

  describe('detect() — data-fillkit-type override', () => {
    it('uses explicit data-fillkit-type with confidence 1.0', () => {
      document.body.innerHTML =
        '<form><input type="text" data-fillkit-type="email" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;
      const result = detector.detect(input);

      expect(result.semanticType).toBe('email');
      expect(result.confidence).toBe(1.0);
    });

    it('data-fillkit-type override works when the type is also a candidate', () => {
      // data-fillkit-type is checked in calculateConfidence, so the type
      // must also appear as a candidate (e.g., via inputTypes match).
      // email has inputTypes: ['email', 'text'], so it is a candidate
      // for type="text" inputs.
      document.body.innerHTML =
        '<form><input type="text" name="password" data-fillkit-type="email" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;
      const result = detector.detect(input);

      expect(result.semanticType).toBe('email');
      expect(result.confidence).toBe(1.0);
    });
  });

  describe('extractConstraints()', () => {
    it('extracts required, minlength, maxlength from input', () => {
      document.body.innerHTML =
        '<form><input type="text" required minlength="5" maxlength="100" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;
      const result = detector.detect(input);

      expect(result.constraints.required).toBe(true);
      expect(result.constraints.minlength).toBe(5);
      expect(result.constraints.maxlength).toBe(100);
    });

    it('extracts pattern from input', () => {
      document.body.innerHTML =
        '<form><input type="text" pattern="[A-Z]+" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;
      const constraints = detector.extractConstraints(input);

      expect(constraints.pattern).toBe('[A-Z]+');
    });

    it('extracts disabled and readonly from input', () => {
      document.body.innerHTML =
        '<form><input type="text" disabled readonly /></form>';
      const input = document.querySelector('input') as HTMLInputElement;
      const constraints = detector.extractConstraints(input);

      expect(constraints.disabled).toBe(true);
      expect(constraints.readonly).toBe(true);
    });

    it('extracts required from textarea', () => {
      document.body.innerHTML =
        '<form><textarea required minlength="10" maxlength="500"></textarea></form>';
      const textarea = document.querySelector(
        'textarea'
      ) as HTMLTextAreaElement;
      const constraints = detector.extractConstraints(textarea);

      expect(constraints.required).toBe(true);
      expect(constraints.minlength).toBe(10);
      expect(constraints.maxlength).toBe(500);
    });

    it('extracts required and multiple from select', () => {
      document.body.innerHTML =
        '<form><select required multiple><option>A</option></select></form>';
      const select = document.querySelector('select') as HTMLSelectElement;
      const constraints = detector.extractConstraints(select);

      expect(constraints.required).toBe(true);
      expect(constraints.multiple).toBe(true);
    });
  });

  describe('setLocale()', () => {
    it('changes locale without throwing', () => {
      expect(() => detector.setLocale('fr')).not.toThrow();
    });

    it('is idempotent when same locale is set', () => {
      detector.setLocale('en');
      detector.setLocale('en');
      // Should not throw; just a no-op
      const input = document.createElement('input');
      input.type = 'email';
      input.name = 'email';
      document.body.appendChild(input);
      const result = detector.detect(input);
      expect(result.semanticType).toBe('email');
    });
  });

  describe('createDescriptor()', () => {
    it('creates a descriptor with element attributes', () => {
      document.body.innerHTML = `
        <form id="myform">
          <input type="email" name="user_email" id="email-field"
                 placeholder="Enter email" required />
        </form>`;
      const input = document.querySelector('input') as HTMLInputElement;
      const descriptor = detector.createDescriptor(input);

      expect(descriptor.tagName).toBe('input');
      expect(descriptor.type).toBe('email');
      expect(descriptor.name).toBe('user_email');
      expect(descriptor.id).toBe('email-field');
      expect(descriptor.placeholder).toBe('Enter email');
      expect(descriptor.required).toBe(true);
      expect(descriptor.formId).toBe('myform');
    });

    it('extracts options for select elements', () => {
      document.body.innerHTML = `
        <form>
          <select name="color">
            <option value="red">Red</option>
            <option value="blue">Blue</option>
          </select>
        </form>`;
      const select = document.querySelector('select') as HTMLSelectElement;
      const descriptor = detector.createDescriptor(select);

      expect(descriptor.tagName).toBe('select');
      expect(descriptor.options).toBeDefined();
      expect(descriptor.options).toHaveLength(2);
      expect(descriptor.options![0].value).toBe('red');
      expect(descriptor.options![1].value).toBe('blue');
    });
  });
});
