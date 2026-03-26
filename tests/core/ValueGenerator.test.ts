import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ValueGenerator } from '@/core/ValueGenerator.js';
import { LocalProvider } from '@/providers/LocalProvider.js';
import { SemanticFieldType } from '@/types/semantic-fields.js';

describe('ValueGenerator', () => {
  let generator: ValueGenerator;
  let provider: LocalProvider;

  beforeEach(async () => {
    generator = new ValueGenerator();
    provider = new LocalProvider({ locale: 'en' });
    await provider.init();
    generator.setProvider(provider);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor & provider management', () => {
    it('creates instance without provider', () => {
      const gen = new ValueGenerator();
      expect(gen.isReady()).toBe(false);
      expect(gen.getProvider()).toBeNull();
    });

    it('setProvider makes instance ready', () => {
      const gen = new ValueGenerator();
      gen.setProvider(provider);
      expect(gen.isReady()).toBe(true);
      expect(gen.getProvider()).toBe(provider);
    });

    it('supportsProfiles returns true for LocalProvider', () => {
      expect(generator.supportsProfiles()).toBe(true);
    });
  });

  describe('generate', () => {
    it('throws when provider is not set', async () => {
      const gen = new ValueGenerator();
      await expect(gen.generate('email')).rejects.toThrow('Provider not set');
    });

    it('generates email containing @', async () => {
      const value = await generator.generate(SemanticFieldType.EMAIL, {
        mode: 'valid',
      });
      expect(typeof value).toBe('string');
      expect(value as string).toContain('@');
    });

    it('generates non-empty first name', async () => {
      const value = await generator.generate(SemanticFieldType.NAME_GIVEN, {
        mode: 'valid',
      });
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    });

    it('generates phone number as string', async () => {
      const value = await generator.generate(SemanticFieldType.PHONE, {
        mode: 'valid',
      });
      expect(typeof value).toBe('string');
    });

    it('generates password as string', async () => {
      const value = await generator.generate(SemanticFieldType.PASSWORD, {
        mode: 'valid',
      });
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    });

    it('returns fallback value for unregistered field type', async () => {
      // LocalProvider falls back to generic text for unknown field types
      const value = await generator.generate('completely_unknown_xyz_123');
      expect(value).not.toBeNull();
      expect(typeof value).toBe('string');
    });
  });

  describe('overrides', () => {
    it('returns semantic type override value', async () => {
      const value = await generator.generate('email', {
        overrides: { email: 'test@test.com' },
      });
      expect(value).toBe('test@test.com');
    });

    it('returns null override when specified', async () => {
      const value = await generator.generate('email', {
        overrides: { email: null },
      });
      expect(value).toBeNull();
    });

    it('returns CSS selector override for matching element', async () => {
      const input = document.createElement('input');
      input.id = 'my-id';
      document.body.appendChild(input);

      try {
        const value = await generator.generate('email', {
          overrides: { '#my-id': 'custom-value' },
          element: input,
        });
        expect(value).toBe('custom-value');
      } finally {
        document.body.removeChild(input);
      }
    });

    it('ignores CSS selector override when element does not match', async () => {
      const input = document.createElement('input');
      input.id = 'other-id';
      document.body.appendChild(input);

      try {
        const value = await generator.generate(SemanticFieldType.EMAIL, {
          overrides: { '#my-id': 'custom-value' },
          element: input,
        });
        // Should fall through to provider-generated email
        expect(typeof value).toBe('string');
        expect(value).not.toBe('custom-value');
      } finally {
        document.body.removeChild(input);
      }
    });

    it('prefers selector override over semantic type override', async () => {
      const input = document.createElement('input');
      input.id = 'my-email';
      document.body.appendChild(input);

      try {
        const value = await generator.generate('email', {
          overrides: {
            email: 'semantic@test.com',
            '#my-email': 'selector@test.com',
          },
          element: input,
        });
        expect(value).toBe('selector@test.com');
      } finally {
        document.body.removeChild(input);
      }
    });
  });

  describe('generateProfile', () => {
    it('throws when provider is not set', async () => {
      const gen = new ValueGenerator();
      await expect(gen.generateProfile()).rejects.toThrow('Provider not set');
    });

    it('returns profile with expected fields', async () => {
      const profile = await generator.generateProfile({ locale: 'en' });
      expect(profile).toBeDefined();
      expect(typeof profile).toBe('object');
      // LocalProvider returns profile with SemanticFieldType keys
      expect(profile[SemanticFieldType.NAME_GIVEN]).toBeDefined();
      expect(profile[SemanticFieldType.NAME_FAMILY]).toBeDefined();
      expect(profile[SemanticFieldType.EMAIL]).toBeDefined();
    });
  });

  describe('generateBatch', () => {
    it('returns Map with values for all requested types', async () => {
      const fieldTypes = [
        SemanticFieldType.EMAIL,
        SemanticFieldType.PHONE,
        SemanticFieldType.NAME_GIVEN,
      ];
      const results = await generator.generateBatch(fieldTypes, {
        mode: 'valid',
      });

      expect(results).toBeInstanceOf(Map);
      expect(results.size).toBe(3);
      for (const fieldType of fieldTypes) {
        expect(results.has(fieldType)).toBe(true);
      }
    });

    it('returns empty Map when no field types provided', async () => {
      const results = await generator.generateBatch([]);
      expect(results).toBeInstanceOf(Map);
      expect(results.size).toBe(0);
    });
  });

  describe('validate', () => {
    it('returns false when provider is not set', async () => {
      const gen = new ValueGenerator();
      const result = await gen.validate('email', 'test@test.com');
      expect(result).toBe(false);
    });

    it('returns true for non-empty value (basic fallback)', async () => {
      const result = await generator.validate('email', 'test@test.com');
      expect(result).toBe(true);
    });

    it('returns false for empty string', async () => {
      const result = await generator.validate('email', '');
      expect(result).toBe(false);
    });
  });
});
