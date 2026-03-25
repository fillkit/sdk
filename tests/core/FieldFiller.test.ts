/**
 * FieldFiller Tests
 *
 * Tests value application to DOM elements with event dispatching and state tracking.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FieldFiller } from '@/core/FieldFiller.js';

describe('FieldFiller', () => {
  let filler: FieldFiller;

  beforeEach(() => {
    filler = new FieldFiller();
    document.body.innerHTML = '';
  });

  describe('fill() — text inputs', () => {
    it('fills a text input with a string value', () => {
      document.body.innerHTML =
        '<form><input type="text" name="username" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;

      filler.fill(input, 'john_doe');
      expect(input.value).toBe('john_doe');
    });

    it('fills an email input', () => {
      document.body.innerHTML =
        '<form><input type="email" name="email" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;

      filler.fill(input, 'test@example.com');
      expect(input.value).toBe('test@example.com');
    });

    it('fills a date input with a date string', () => {
      document.body.innerHTML =
        '<form><input type="date" name="birthdate" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;

      filler.fill(input, '2000-01-15');
      expect(input.value).toBe('2000-01-15');
    });
  });

  describe('fill() — select elements', () => {
    it('selects an option by matching value', () => {
      document.body.innerHTML = `
        <form>
          <select name="color">
            <option value="">Choose</option>
            <option value="red">Red</option>
            <option value="blue">Blue</option>
          </select>
        </form>`;
      const select = document.querySelector('select') as HTMLSelectElement;

      filler.fill(select, 'blue');
      expect(select.value).toBe('blue');
    });

    it('selects a fallback option when value does not match', () => {
      document.body.innerHTML = `
        <form>
          <select name="color">
            <option value="">Choose</option>
            <option value="red">Red</option>
            <option value="blue">Blue</option>
          </select>
        </form>`;
      const select = document.querySelector('select') as HTMLSelectElement;

      filler.fill(select, 'nonexistent');
      // Should pick a valid option (skipping the empty placeholder)
      expect(select.value).not.toBe('');
    });
  });

  describe('fill() — textarea', () => {
    it('fills a textarea with a string value', () => {
      document.body.innerHTML =
        '<form><textarea name="message"></textarea></form>';
      const textarea = document.querySelector(
        'textarea'
      ) as HTMLTextAreaElement;

      filler.fill(textarea, 'Hello, world!');
      expect(textarea.value).toBe('Hello, world!');
    });
  });

  describe('fill() — checkbox and radio', () => {
    it('sets checkbox to checked when value is true', () => {
      document.body.innerHTML =
        '<form><input type="checkbox" name="agree" /></form>';
      const checkbox = document.querySelector('input') as HTMLInputElement;

      filler.fill(checkbox, true);
      expect(checkbox.checked).toBe(true);
    });

    it('sets radio button to checked', () => {
      document.body.innerHTML = `
        <form>
          <input type="radio" name="gender" value="male" />
          <input type="radio" name="gender" value="female" />
        </form>`;
      const radios = document.querySelectorAll('input[type="radio"]');
      const maleRadio = radios[0] as HTMLInputElement;

      filler.fill(maleRadio, true);
      expect(maleRadio.checked).toBe(true);
    });
  });

  describe('fill() — tracking attributes', () => {
    it('sets data-fillkit-filled attribute after fill', () => {
      document.body.innerHTML =
        '<form><input type="text" name="username" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;

      filler.fill(input, 'test_value');
      expect(input.hasAttribute('data-fillkit-filled')).toBe(true);
      expect(input.getAttribute('data-fillkit-filled')).toBe('test_value');
    });

    it('adds fillkit-field-filled class after fill', () => {
      document.body.innerHTML =
        '<form><input type="text" name="username" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;

      filler.fill(input, 'test_value');
      expect(input.classList.contains('fillkit-field-filled')).toBe(true);
    });

    it('sets data-filled-by attribute when source is provided', () => {
      document.body.innerHTML =
        '<form><input type="text" name="username" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;

      filler.fill(input, 'test_value', 'cloud');
      expect(input.getAttribute('data-filled-by')).toBe('cloud');
    });
  });

  describe('fill() — null value', () => {
    it('does nothing when value is null', () => {
      document.body.innerHTML =
        '<form><input type="text" name="username" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;

      filler.fill(input, null);
      expect(input.value).toBe('');
      expect(input.hasAttribute('data-fillkit-filled')).toBe(false);
    });
  });

  describe('clear()', () => {
    it('clears input value and removes tracking attributes', () => {
      document.body.innerHTML =
        '<form><input type="text" name="username" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;

      filler.fill(input, 'test_value');
      expect(input.value).toBe('test_value');

      filler.clear(input);
      expect(input.value).toBe('');
      expect(input.hasAttribute('data-fillkit-filled')).toBe(false);
      expect(input.hasAttribute('data-filled-by')).toBe(false);
      expect(input.classList.contains('fillkit-field-filled')).toBe(false);
    });

    it('clears checkbox by setting checked to false', () => {
      document.body.innerHTML =
        '<form><input type="checkbox" name="agree" /></form>';
      const checkbox = document.querySelector('input') as HTMLInputElement;

      filler.fill(checkbox, true);
      filler.clear(checkbox);
      expect(checkbox.checked).toBe(false);
    });

    it('clears select by resetting selectedIndex to 0', () => {
      document.body.innerHTML = `
        <form>
          <select name="color">
            <option value="">Choose</option>
            <option value="red">Red</option>
          </select>
        </form>`;
      const select = document.querySelector('select') as HTMLSelectElement;

      filler.fill(select, 'red');
      filler.clear(select);
      expect(select.selectedIndex).toBe(0);
    });

    it('dispatches input and change events on clear', () => {
      document.body.innerHTML =
        '<form><input type="text" name="email" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;

      filler.fill(input, 'test@example.com');

      const events: string[] = [];
      input.addEventListener('input', () => events.push('input'));
      input.addEventListener('change', () => events.push('change'));

      filler.clear(input);
      expect(events).toContain('input');
      expect(events).toContain('change');
      expect(events.indexOf('input')).toBeLessThan(events.indexOf('change'));
    });

    it('clears textarea value', () => {
      document.body.innerHTML =
        '<form><textarea name="message"></textarea></form>';
      const textarea = document.querySelector(
        'textarea'
      ) as HTMLTextAreaElement;

      filler.fill(textarea, 'Hello world');
      expect(textarea.value).toBe('Hello world');

      filler.clear(textarea);
      expect(textarea.value).toBe('');
    });
  });

  describe('hasUserInput()', () => {
    it('returns false for an unfilled, empty field', () => {
      document.body.innerHTML =
        '<form><input type="text" name="username" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;

      expect(filler.hasUserInput(input)).toBe(false);
    });

    it('returns false after FillKit fills the field (value unchanged)', () => {
      document.body.innerHTML =
        '<form><input type="text" name="username" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;

      filler.fill(input, 'fillkit_value');
      expect(filler.hasUserInput(input)).toBe(false);
    });

    it('returns true when user modifies the filled value', () => {
      document.body.innerHTML =
        '<form><input type="text" name="username" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;

      filler.fill(input, 'fillkit_value');
      // Simulate user changing the value
      input.value = 'user_changed';
      expect(filler.hasUserInput(input)).toBe(true);
    });
  });

  describe('clearAll()', () => {
    it('clears all inputs within scope', () => {
      document.body.innerHTML = `
        <form>
          <input type="text" name="name" />
          <input type="email" name="email" />
          <textarea name="msg"></textarea>
        </form>`;
      const form = document.querySelector('form') as HTMLFormElement;
      const nameInput = document.querySelector(
        'input[name="name"]'
      ) as HTMLInputElement;
      const emailInput = document.querySelector(
        'input[name="email"]'
      ) as HTMLInputElement;
      const textarea = document.querySelector(
        'textarea'
      ) as HTMLTextAreaElement;

      filler.fill(nameInput, 'John');
      filler.fill(emailInput, 'john@test.com');
      filler.fill(textarea, 'Hello');

      filler.clearAll(form);

      expect(nameInput.value).toBe('');
      expect(emailInput.value).toBe('');
      expect(textarea.value).toBe('');
      expect(nameInput.hasAttribute('data-fillkit-filled')).toBe(false);
      expect(emailInput.hasAttribute('data-fillkit-filled')).toBe(false);
      expect(textarea.hasAttribute('data-fillkit-filled')).toBe(false);
    });
  });

  describe('batch mode', () => {
    it('defers class addition until finalizeBatch()', () => {
      document.body.innerHTML = `
        <form>
          <input type="text" name="a" />
          <input type="text" name="b" />
        </form>`;
      const inputA = document.querySelector(
        'input[name="a"]'
      ) as HTMLInputElement;
      const inputB = document.querySelector(
        'input[name="b"]'
      ) as HTMLInputElement;

      filler.startBatch();
      filler.fill(inputA, 'value_a');
      filler.fill(inputB, 'value_b');

      // Values should be set immediately
      expect(inputA.value).toBe('value_a');
      expect(inputB.value).toBe('value_b');

      // But class should not be added yet
      expect(inputA.classList.contains('fillkit-field-filled')).toBe(false);
      expect(inputB.classList.contains('fillkit-field-filled')).toBe(false);

      filler.finalizeBatch();

      // Now class should be present
      expect(inputA.classList.contains('fillkit-field-filled')).toBe(true);
      expect(inputB.classList.contains('fillkit-field-filled')).toBe(true);
    });

    it('sets data-fillkit-filled attribute even during batch mode', () => {
      document.body.innerHTML = '<form><input type="text" name="a" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;

      filler.startBatch();
      filler.fill(input, 'batched');

      expect(input.getAttribute('data-fillkit-filled')).toBe('batched');

      filler.finalizeBatch();
    });
  });

  describe('isFilled()', () => {
    it('returns true for filled elements', () => {
      document.body.innerHTML = '<form><input type="text" name="x" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;

      filler.fill(input, 'val');
      expect(filler.isFilled(input)).toBe(true);
    });

    it('returns false for unfilled elements', () => {
      document.body.innerHTML = '<form><input type="text" name="x" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;

      expect(filler.isFilled(input)).toBe(false);
    });

    it('returns false after clearing', () => {
      document.body.innerHTML = '<form><input type="text" name="x" /></form>';
      const input = document.querySelector('input') as HTMLInputElement;

      filler.fill(input, 'val');
      filler.clear(input);
      expect(filler.isFilled(input)).toBe(false);
    });
  });
});
