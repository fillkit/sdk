import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ContextCollector } from '@/core/ContextCollector.js';

describe('ContextCollector', () => {
  let collector: ContextCollector;

  beforeEach(() => {
    collector = new ContextCollector();
  });

  afterEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';
    document.title = '';
  });

  describe('getPageContext', () => {
    it('returns object with url and title', () => {
      document.title = 'Test Page';
      const context = collector.getPageContext();

      expect(context.url).toBe(window.location.href);
      expect(context.title).toBe('Test Page');
      expect(context.pathname).toBe(window.location.pathname);
    });

    it('includes meta description when present', () => {
      const meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      meta.setAttribute('content', 'A test page description');
      document.head.appendChild(meta);

      const context = collector.getPageContext();
      expect(context.description).toBe('A test page description');

      document.head.removeChild(meta);
    });

    it('collects headings from page', () => {
      document.body.innerHTML = '<h1>Main Title</h1><h2>Subtitle</h2>';

      const context = collector.getPageContext();
      expect(context.headings).toHaveLength(2);
      expect(context.headings[0]).toEqual({ level: 1, text: 'Main Title' });
      expect(context.headings[1]).toEqual({ level: 2, text: 'Subtitle' });
    });

    it('caches page context on repeated calls', () => {
      document.title = 'Original Title';
      const first = collector.getPageContext();

      document.title = 'Changed Title';
      const second = collector.getPageContext();

      // Same reference since it is cached
      expect(second).toBe(first);
      expect(second.title).toBe('Original Title');
    });
  });

  describe('getFormContext', () => {
    it('returns form action and identifier', () => {
      const form = document.createElement('form');
      form.setAttribute('id', 'login-form');
      form.setAttribute('action', '/api/login');
      document.body.appendChild(form);

      const context = collector.getFormContext(form);
      expect(context.formId).toBe('login-form');
      expect(context.formAction).toBe('/api/login');
    });

    it('uses name attribute when id is absent', () => {
      const form = document.createElement('form');
      form.setAttribute('name', 'signup');
      document.body.appendChild(form);

      const context = collector.getFormContext(form);
      expect(context.formId).toBe('signup');
    });

    it('generates positional id when no id or name', () => {
      const form = document.createElement('form');
      document.body.appendChild(form);

      const context = collector.getFormContext(form);
      expect(context.formId).toBe('form-0');
    });

    it('collects legend texts from form', () => {
      const form = document.createElement('form');
      form.innerHTML = '<fieldset><legend>Personal Info</legend></fieldset>';
      document.body.appendChild(form);

      const context = collector.getFormContext(form);
      expect(context.legendTexts).toContain('Personal Info');
    });

    it('collects fields from form', () => {
      const form = document.createElement('form');
      form.innerHTML =
        '<input name="email" type="email" /><input name="password" type="password" />';
      document.body.appendChild(form);

      const context = collector.getFormContext(form);
      expect(context.fields.length).toBe(2);
    });
  });

  describe('getFieldContext', () => {
    it('returns field attributes', () => {
      const form = document.createElement('form');
      const input = document.createElement('input');
      input.setAttribute('name', 'user_email');
      input.setAttribute('id', 'email-input');
      input.setAttribute('type', 'email');
      input.setAttribute('placeholder', 'Enter your email');
      form.appendChild(input);
      document.body.appendChild(form);

      const context = collector.getFieldContext(input);
      expect(context.name).toBe('user_email');
      expect(context.id).toBe('email-input');
      expect(context.type).toBe('email');
      expect(context.placeholder).toBe('Enter your email');
    });

    it('resolves label via for attribute', () => {
      const label = document.createElement('label');
      label.setAttribute('for', 'email-field');
      label.textContent = 'Email Address';
      const input = document.createElement('input');
      input.setAttribute('id', 'email-field');
      document.body.appendChild(label);
      document.body.appendChild(input);

      const context = collector.getFieldContext(input);
      expect(context.labelText).toBe('Email Address');
    });

    it('returns undefined for fields without labels or attributes', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      const context = collector.getFieldContext(input);
      expect(context.name).toBeUndefined();
      expect(context.id).toBeUndefined();
      expect(context.placeholder).toBeUndefined();
      expect(context.labelText).toBeUndefined();
    });
  });

  describe('clearCache', () => {
    it('clears cached page context', () => {
      document.title = 'Before Clear';
      const before = collector.getPageContext();

      collector.clearCache();

      document.title = 'After Clear';
      const after = collector.getPageContext();

      expect(before.title).toBe('Before Clear');
      expect(after.title).toBe('After Clear');
      expect(before).not.toBe(after);
    });
  });
});
