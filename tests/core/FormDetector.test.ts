/**
 * FormDetector Tests
 *
 * Tests form and field discovery in the DOM with selector-based filtering.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FormDetector } from '@/core/FormDetector.js';

describe('FormDetector', () => {
  let detector: FormDetector;

  beforeEach(() => {
    detector = new FormDetector();
    document.body.innerHTML = '';
  });

  describe('findForms()', () => {
    it('detects a single form element', () => {
      document.body.innerHTML = `
        <form id="login"><input type="text" name="user" /></form>`;
      const forms = detector.findForms(document);

      expect(forms).toHaveLength(1);
      expect(forms[0].id).toBe('login');
    });

    it('detects multiple forms', () => {
      document.body.innerHTML = `
        <form id="form1"><input type="text" /></form>
        <form id="form2"><input type="text" /></form>
        <form id="form3"><input type="text" /></form>`;
      const forms = detector.findForms(document);

      expect(forms).toHaveLength(3);
    });

    it('excludes forms matching excludeSelectors', () => {
      document.body.innerHTML = `
        <form id="keep"><input type="text" /></form>
        <form id="skip" class="no-fill"><input type="text" /></form>`;
      const forms = detector.findForms(document, {
        excludeSelectors: ['.no-fill'],
      });

      expect(forms).toHaveLength(1);
      expect(forms[0].id).toBe('keep');
    });

    it('only returns forms matching includeSelectors', () => {
      document.body.innerHTML = `
        <form id="target" class="auto-fill"><input type="text" /></form>
        <form id="other"><input type="text" /></form>`;
      const forms = detector.findForms(document, {
        includeSelectors: ['.auto-fill'],
      });

      expect(forms).toHaveLength(1);
      expect(forms[0].id).toBe('target');
    });

    it('skips forms with data-fillkit-ignore attribute', () => {
      document.body.innerHTML = `
        <form id="normal"><input type="text" /></form>
        <form id="ignored" data-fillkit-ignore><input type="text" /></form>`;
      const forms = detector.findForms(document);

      expect(forms).toHaveLength(1);
      expect(forms[0].id).toBe('normal');
    });

    it('returns empty array when no forms exist', () => {
      document.body.innerHTML = '<div>No forms here</div>';
      const forms = detector.findForms(document);

      expect(forms).toHaveLength(0);
    });
  });

  describe('findFields()', () => {
    it('returns inputs, selects, and textareas', () => {
      document.body.innerHTML = `
        <form id="f">
          <input type="text" name="name" />
          <select name="country"><option>US</option></select>
          <textarea name="notes"></textarea>
        </form>`;
      const form = document.querySelector('form') as HTMLFormElement;
      const fields = detector.findFields(form);

      expect(fields).toHaveLength(3);
      const tagNames = fields.map(f => f.tagName.toLowerCase());
      expect(tagNames).toContain('input');
      expect(tagNames).toContain('select');
      expect(tagNames).toContain('textarea');
    });

    it('skips hidden inputs', () => {
      document.body.innerHTML = `
        <form>
          <input type="text" name="visible" />
          <input type="hidden" name="csrf_token" value="abc" />
        </form>`;
      const form = document.querySelector('form') as HTMLFormElement;
      const fields = detector.findFields(form);

      expect(fields).toHaveLength(1);
      expect((fields[0] as HTMLInputElement).name).toBe('visible');
    });

    it('skips disabled inputs', () => {
      document.body.innerHTML = `
        <form>
          <input type="text" name="enabled" />
          <input type="text" name="disabled" disabled />
        </form>`;
      const form = document.querySelector('form') as HTMLFormElement;
      const fields = detector.findFields(form);

      expect(fields).toHaveLength(1);
      expect((fields[0] as HTMLInputElement).name).toBe('enabled');
    });

    it('skips readonly inputs', () => {
      document.body.innerHTML = `
        <form>
          <input type="text" name="editable" />
          <input type="text" name="readonly" readonly />
        </form>`;
      const form = document.querySelector('form') as HTMLFormElement;
      const fields = detector.findFields(form);

      expect(fields).toHaveLength(1);
      expect((fields[0] as HTMLInputElement).name).toBe('editable');
    });

    it('skips submit and button inputs', () => {
      document.body.innerHTML = `
        <form>
          <input type="text" name="name" />
          <input type="submit" value="Submit" />
          <input type="button" value="Click" />
          <input type="reset" value="Reset" />
          <input type="image" src="x.png" />
        </form>`;
      const form = document.querySelector('form') as HTMLFormElement;
      const fields = detector.findFields(form);

      expect(fields).toHaveLength(1);
      expect((fields[0] as HTMLInputElement).name).toBe('name');
    });

    it('excludes fields matching excludeSelectors', () => {
      document.body.innerHTML = `
        <form>
          <input type="text" name="keep" />
          <input type="text" name="skip" class="no-fill" />
        </form>`;
      const form = document.querySelector('form') as HTMLFormElement;
      const fields = detector.findFields(form, {
        excludeSelectors: ['.no-fill'],
      });

      expect(fields).toHaveLength(1);
      expect((fields[0] as HTMLInputElement).name).toBe('keep');
    });

    it('skips fields with data-fillkit-ignore attribute', () => {
      document.body.innerHTML = `
        <form>
          <input type="text" name="normal" />
          <input type="text" name="ignored" data-fillkit-ignore />
        </form>`;
      const form = document.querySelector('form') as HTMLFormElement;
      const fields = detector.findFields(form);

      expect(fields).toHaveLength(1);
      expect((fields[0] as HTMLInputElement).name).toBe('normal');
    });

    it('returns empty array for a form with no fillable fields', () => {
      document.body.innerHTML = `
        <form>
          <input type="hidden" name="token" />
          <input type="submit" value="Go" />
        </form>`;
      const form = document.querySelector('form') as HTMLFormElement;
      const fields = detector.findFields(form);

      expect(fields).toHaveLength(0);
    });
  });

  describe('findExternalFormFields()', () => {
    it('finds fields outside the form that reference it by form attribute', () => {
      document.body.innerHTML = `
        <form id="myform">
          <input type="text" name="inside" />
        </form>
        <input type="text" name="outside" form="myform" />`;
      const externalFields = detector.findExternalFormFields('myform');

      expect(externalFields).toHaveLength(1);
      expect((externalFields[0] as HTMLInputElement).name).toBe('outside');
    });

    it('returns empty array when no external fields exist', () => {
      document.body.innerHTML = `
        <form id="myform">
          <input type="text" name="inside" />
        </form>`;
      const externalFields = detector.findExternalFormFields('myform');

      expect(externalFields).toHaveLength(0);
    });
  });

  describe('isFieldIgnored()', () => {
    it('reports hidden input as ignored', () => {
      document.body.innerHTML = '<input type="hidden" name="x" />';
      const input = document.querySelector('input') as HTMLInputElement;

      expect(detector.isFieldIgnored(input)).toBe(true);
    });

    it('reports disabled select as ignored', () => {
      document.body.innerHTML = '<select disabled><option>A</option></select>';
      const select = document.querySelector('select') as HTMLSelectElement;

      expect(detector.isFieldIgnored(select)).toBe(true);
    });

    it('reports normal text input as not ignored', () => {
      document.body.innerHTML = '<input type="text" name="x" />';
      const input = document.querySelector('input') as HTMLInputElement;

      expect(detector.isFieldIgnored(input)).toBe(false);
    });
  });
});
