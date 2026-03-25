import { describe, it, expect } from 'vitest';
import { FIELD_TYPE_REGISTRY } from '@/types/semantic-fields.js';

describe('AGE pattern specificity', () => {
  const allTypes = Object.values(FIELD_TYPE_REGISTRY);
  const textTypes = allTypes.filter(t => t.inputTypes.has('text'));

  const findNameMatches = (name: string) =>
    textTypes.filter(t => t.namePatterns.some(p => p.test(name)));

  it('should NOT match "userAgent"', () => {
    const matches = findNameMatches('userAgent');
    const types = matches.map(m => m.type);
    expect(types).not.toContain('age');
    expect(types).toContain('userAgent');
  });

  it('should NOT match "language"', () => {
    const matches = findNameMatches('language');
    const types = matches.map(m => m.type);
    expect(types).not.toContain('age');
    expect(types).toContain('language');
  });

  it('should NOT match "package"', () => {
    const matches = findNameMatches('package');
    const types = matches.map(m => m.type);
    expect(types).not.toContain('age');
  });

  it('should match "age" exactly', () => {
    const matches = findNameMatches('age');
    const types = matches.map(m => m.type);
    expect(types).toContain('age');
  });

  it('should match "user_age"', () => {
    const matches = findNameMatches('user_age');
    const types = matches.map(m => m.type);
    expect(types).toContain('age');
  });

  it('creditCardExpiry should match creditCard.expiry', () => {
    const matches = findNameMatches('creditCardExpiry');
    const types = matches.map(m => m.type);
    expect(types).toContain('creditCard.expiry');
  });
});
