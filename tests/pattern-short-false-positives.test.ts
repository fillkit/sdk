import { describe, it, expect } from 'vitest';
import { FIELD_TYPE_REGISTRY } from '@/types/semantic-fields.js';

describe('short pattern false positives', () => {
  const allTypes = Object.values(FIELD_TYPE_REGISTRY);
  const textTypes = allTypes.filter(t => t.inputTypes.has('text'));

  const findNameMatches = (name: string) =>
    textTypes
      .filter(t => t.namePatterns.some(p => p.test(name)))
      .map(t => t.type);

  // /int/i could match "point", "print", "hint", "tint"
  it('/int/i should not match "point"', () => {
    expect(findNameMatches('point')).not.toContain('integer');
  });

  it('/int/i should not match "printName"', () => {
    expect(findNameMatches('printName')).not.toContain('integer');
  });

  // /pet/i could match "carpet", "compete", "petName" (ok), "repetition"
  it('/pet/i should not match "carpet"', () => {
    expect(findNameMatches('carpet')).not.toContain('petName');
  });

  it('/pet/i should not match "competition"', () => {
    expect(findNameMatches('competition')).not.toContain('petName');
  });

  // /sha/i could match "shape", "share", "shadow"
  it('/sha/i should not match "shape"', () => {
    expect(findNameMatches('shape')).not.toContain('commitSha');
  });

  // /bic/i could match "bicycleType"
  it('/bic/i should not match "bicycleType"', () => {
    expect(findNameMatches('bicycleType')).not.toContain('bic');
  });
});
