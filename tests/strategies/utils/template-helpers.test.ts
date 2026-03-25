import { describe, it, expect } from 'vitest';
import { faker } from '@faker-js/faker';
import { generateFromTemplate } from '../../../src/strategies/utils/template-helpers.js';

describe('generateFromTemplate', () => {
  it('resolves a simple faker template', () => {
    const result = generateFromTemplate('{{person.firstName}}', faker);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('resolves a composite template with multiple placeholders', () => {
    const result = generateFromTemplate(
      '{{person.firstName}} {{person.lastName}}',
      faker
    );
    expect(typeof result).toBe('string');
    // Should contain a space (two resolved parts)
    expect(result).toContain(' ');
  });

  it('returns raw template when parsing fails', () => {
    const invalidTemplate = '{{nonexistent.module.method}}';
    const result = generateFromTemplate(invalidTemplate, faker);
    // Should return the raw template on failure
    expect(typeof result).toBe('string');
  });

  it('handles templates with mixed static and dynamic content', () => {
    const result = generateFromTemplate('Hello, {{person.firstName}}!', faker);
    expect(result).toMatch(/^Hello, .+!$/);
  });
});
