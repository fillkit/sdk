import { describe, it, expect } from 'vitest';
import {
  resolveVisibility,
  enforceVisibilityConstraints,
  defaultVisibility,
  unresolveVisibility,
  type ResolvedUiVisibility,
} from '@/state/atoms/ui-config.js';

describe('resolveVisibility', () => {
  it('returns all-true defaults when called with undefined', () => {
    const result = resolveVisibility(undefined);
    expect(result).toEqual(defaultVisibility);
  });

  it('returns all-true defaults when called with empty object', () => {
    const result = resolveVisibility({});
    expect(result).toEqual(defaultVisibility);
  });

  it('hides optionsSheet when set to false', () => {
    const result = resolveVisibility({ optionsSheet: false });
    expect(result.optionsSheet).toBe(false);
    // Other sections remain at defaults
    expect(result.providerMode).toEqual(defaultVisibility.providerMode);
  });

  it('hides entire section when set to false', () => {
    const result = resolveVisibility({ behavior: false });
    expect(result.behavior).toBe(false);
  });

  it('normalizes section boolean true to full object with defaults', () => {
    const result = resolveVisibility({ behavior: true });
    expect(result.behavior).toEqual(defaultVisibility.behavior);
  });

  it('merges partial field visibility with defaults', () => {
    const result = resolveVisibility({
      behavior: { overrides: false, includeSelectors: false },
    });
    expect(result.behavior).not.toBe(false);
    if (result.behavior !== false) {
      expect(result.behavior.overrides).toBe(false);
      expect(result.behavior.includeSelectors).toBe(false);
      // Defaults for unspecified fields
      expect(result.behavior.refill).toBe(true);
      expect(result.behavior.watchMode).toBe(true);
      expect(result.behavior.includeOutsideForms).toBe(true);
      expect(result.behavior.emailDomain).toBe(true);
      expect(result.behavior.excludeSelectors).toBe(true);
    }
  });

  it('hides language section', () => {
    const result = resolveVisibility({ language: false });
    expect(result.language).toBe(false);
  });

  it('hides provider field but keeps mode visible', () => {
    const result = resolveVisibility({
      providerMode: { provider: false },
    });
    expect(result.providerMode).not.toBe(false);
    if (result.providerMode !== false) {
      expect(result.providerMode.provider).toBe(false);
      expect(result.providerMode.mode).toBe(true);
    }
  });
});

describe('enforceVisibilityConstraints', () => {
  it('collapses section to false when all fields are hidden', () => {
    const vis: ResolvedUiVisibility = {
      ...defaultVisibility,
      providerMode: { provider: false, mode: false },
    };
    const result = enforceVisibilityConstraints(vis);
    expect(result.providerMode).toBe(false);
  });

  it('collapses behavior section when all fields are hidden', () => {
    const vis: ResolvedUiVisibility = {
      ...defaultVisibility,
      behavior: {
        refill: false,
        watchMode: false,
        includeOutsideForms: false,
        emailDomain: false,
        includeSelectors: false,
        excludeSelectors: false,
        overrides: false,
      },
    };
    const result = enforceVisibilityConstraints(vis);
    expect(result.behavior).toBe(false);
  });

  it('collapses cloudConfig section when all fields are hidden', () => {
    const vis: ResolvedUiVisibility = {
      ...defaultVisibility,
      cloudConfig: {
        apiKey: false,
        projectSelector: false,
        datasetStatus: false,
        actions: false,
      },
    };
    const result = enforceVisibilityConstraints(vis);
    expect(result.cloudConfig).toBe(false);
  });

  it('forces cloudConfig visible when provider hidden + cloud active', () => {
    const vis: ResolvedUiVisibility = {
      ...defaultVisibility,
      providerMode: { provider: false, mode: true },
      cloudConfig: false,
    };
    const result = enforceVisibilityConstraints(vis, 'cloud');
    // cloudConfig should be forced to a full object
    expect(result.cloudConfig).not.toBe(false);
    if (result.cloudConfig !== false) {
      expect(result.cloudConfig.apiKey).toBe(true);
    }
  });

  it('forces language hidden when provider hidden + cloud active', () => {
    const vis: ResolvedUiVisibility = {
      ...defaultVisibility,
      providerMode: { provider: false, mode: true },
      language: true,
    };
    const result = enforceVisibilityConstraints(vis, 'cloud');
    expect(result.language).toBe(false);
  });

  it('forces apiKey visible when cloud is active', () => {
    const vis: ResolvedUiVisibility = {
      ...defaultVisibility,
      cloudConfig: {
        apiKey: false,
        projectSelector: true,
        datasetStatus: true,
        actions: true,
      },
    };
    const result = enforceVisibilityConstraints(vis, 'cloud');
    if (result.cloudConfig !== false) {
      expect(result.cloudConfig.apiKey).toBe(true);
    }
  });

  it('does not force cloudConfig when provider is local', () => {
    const vis: ResolvedUiVisibility = {
      ...defaultVisibility,
      providerMode: { provider: false, mode: true },
      cloudConfig: false,
    };
    const result = enforceVisibilityConstraints(vis, 'local');
    expect(result.cloudConfig).toBe(false);
  });

  it('does not mutate when no constraints apply', () => {
    const result = enforceVisibilityConstraints(
      { ...defaultVisibility },
      'local'
    );
    expect(result).toEqual(defaultVisibility);
  });
});

describe('unresolveVisibility', () => {
  it('roundtrips from default visibility', () => {
    const unresolved = unresolveVisibility(defaultVisibility);
    const resolved = resolveVisibility(unresolved);
    expect(resolved).toEqual(defaultVisibility);
  });

  it('preserves false sections', () => {
    const vis: ResolvedUiVisibility = {
      ...defaultVisibility,
      behavior: false,
      language: false,
    };
    const unresolved = unresolveVisibility(vis);
    expect(unresolved.behavior).toBe(false);
    expect(unresolved.language).toBe(false);
  });
});

describe('resolveVisibility with merging', () => {
  it('merges current state with new input', () => {
    // Simulate the merge pattern used in FillKit constructor/updateOptions
    const current = resolveVisibility({ language: false });
    const newInput = { behavior: { overrides: false } as const };
    const merged = resolveVisibility({
      ...unresolveVisibility(current),
      ...newInput,
    });

    expect(merged.language).toBe(false); // Preserved from current
    expect(merged.behavior).not.toBe(false);
    if (merged.behavior !== false) {
      expect(merged.behavior.overrides).toBe(false); // From new input
      expect(merged.behavior.refill).toBe(true); // Default
    }
  });
});
