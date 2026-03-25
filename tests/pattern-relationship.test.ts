import { describe, it, expect } from 'vitest';
import { FIELD_TYPE_REGISTRY } from '@/types/semantic-fields.js';

describe('relationship field detection', () => {
  const allTypes = Object.values(FIELD_TYPE_REGISTRY);
  const textTypes = allTypes.filter(t => t.inputTypes.has('text'));

  const findNameMatches = (name: string) =>
    textTypes
      .filter(t => t.namePatterns.some(p => p.test(name)))
      .map(t => t.type);

  const findLabelMatches = (label: string) =>
    allTypes
      .filter(t => t.labelPatterns.some(p => p.test(label)))
      .map(t => t.type);

  it('check emergencyRelationship name matches', () => {
    const types = findNameMatches('emergencyRelationship');
    expect(types).not.toContain('latitude');
    expect(types).not.toContain('longitude');
  });

  it('check sponsorRelationship name matches', () => {
    const types = findNameMatches('sponsorRelationship');
    expect(types).not.toContain('latitude');
    expect(types).not.toContain('longitude');
  });

  it('"Relationship" label should NOT match IP_ADDRESS', () => {
    expect(findLabelMatches('Relationship')).not.toContain('ipAddress');
  });

  it('"Emergency Relationship" label should NOT match IP_ADDRESS', () => {
    expect(findLabelMatches('Emergency Relationship')).not.toContain(
      'ipAddress'
    );
  });

  it('"Relationship Type" label should NOT match IP_ADDRESS', () => {
    expect(findLabelMatches('Relationship Type')).not.toContain('ipAddress');
  });
});
