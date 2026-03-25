import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  LocaleManager,
  LOCALE_PATTERNS,
  getFieldPatterns,
} from '@/locales/index.js';
import { Faker } from '@faker-js/faker';

describe('LocaleManager', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('creates instance with default locale en', () => {
      const manager = new LocaleManager();
      expect(manager.getDefaultLocale()).toBe('en');
    });

    it('creates instance with custom default locale', () => {
      const manager = new LocaleManager('fr');
      expect(manager.getDefaultLocale()).toBe('fr');
    });
  });

  describe('getSupportedLocales', () => {
    it('returns an array of 50+ locales', () => {
      const manager = new LocaleManager();
      const locales = manager.getSupportedLocales();
      expect(Array.isArray(locales)).toBe(true);
      expect(locales.length).toBeGreaterThanOrEqual(50);
    });

    it('includes common locale codes', () => {
      const manager = new LocaleManager();
      const locales = manager.getSupportedLocales();
      expect(locales).toContain('en');
      expect(locales).toContain('fr');
      expect(locales).toContain('de');
      expect(locales).toContain('es');
      expect(locales).toContain('ja');
      expect(locales).toContain('zh_CN');
    });
  });

  describe('getInstance', () => {
    it('returns Faker instance for en locale', () => {
      const manager = new LocaleManager();
      const faker = manager.getInstance('en');
      expect(faker).toBeInstanceOf(Faker);
    });

    it('returns Faker instance for fr locale', () => {
      const manager = new LocaleManager();
      const faker = manager.getInstance('fr');
      expect(faker).toBeInstanceOf(Faker);
      // French faker should produce a person name
      const name = faker.person.firstName();
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    });

    it('returns same instance on repeated calls (caching)', () => {
      const manager = new LocaleManager();
      const first = manager.getInstance('de');
      const second = manager.getInstance('de');
      expect(first).toBe(second);
    });

    it('returns default locale instance when no argument', () => {
      const manager = new LocaleManager('en');
      const faker = manager.getInstance();
      expect(faker).toBeInstanceOf(Faker);
    });

    it('falls back to English for unsupported locale with warning', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const manager = new LocaleManager();
      const faker = manager.getInstance('nonexistent_xyz');

      expect(faker).toBeInstanceOf(Faker);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('not found')
      );
    });
  });

  describe('setDefaultLocale', () => {
    it('changes the default locale', () => {
      const manager = new LocaleManager('en');
      manager.setDefaultLocale('de');
      expect(manager.getDefaultLocale()).toBe('de');
    });
  });

  describe('isSupported', () => {
    it('returns true for supported locales', () => {
      const manager = new LocaleManager();
      expect(manager.isSupported('en')).toBe(true);
      expect(manager.isSupported('fr')).toBe(true);
      expect(manager.isSupported('de')).toBe(true);
    });

    it('returns false for unsupported locale', () => {
      const manager = new LocaleManager();
      expect(manager.isSupported('nonexistent_xyz')).toBe(false);
    });

    it('normalizes locale codes', () => {
      const manager = new LocaleManager();
      // pt should normalize to pt_BR
      expect(manager.isSupported('pt')).toBe(true);
      // zh should normalize to zh_CN
      expect(manager.isSupported('zh')).toBe(true);
    });
  });
});

describe('LOCALE_PATTERNS', () => {
  it('has patterns for English', () => {
    expect(LOCALE_PATTERNS).toHaveProperty('en');
  });

  it('has patterns for French', () => {
    expect(LOCALE_PATTERNS).toHaveProperty('fr');
  });

  it('has patterns for German', () => {
    expect(LOCALE_PATTERNS).toHaveProperty('de');
  });

  it('pattern object has expected structure', () => {
    const enPatterns = LOCALE_PATTERNS.en;
    expect(enPatterns).toHaveProperty('name');
    expect(enPatterns).toHaveProperty('placeholder');
    expect(enPatterns).toHaveProperty('label');
  });
});

describe('getFieldPatterns', () => {
  it('returns English patterns for en', () => {
    const patterns = getFieldPatterns('en');
    expect(patterns).toBeDefined();
    expect(patterns).toHaveProperty('name');
    expect(patterns).toHaveProperty('placeholder');
    expect(patterns).toHaveProperty('label');
  });

  it('returns patterns with email detection', () => {
    const patterns = getFieldPatterns('en');
    expect(patterns.name).toHaveProperty('email');
    expect(Array.isArray(patterns.name.email)).toBe(true);
    expect(patterns.name.email.length).toBeGreaterThan(0);
  });

  it('falls back to en patterns for unsupported locale', () => {
    const fallback = getFieldPatterns('xyz_unknown');
    const en = getFieldPatterns('en');
    expect(fallback).toBe(en);
  });

  it('extracts base language code from regional locale', () => {
    const enUs = getFieldPatterns('en_US');
    const en = getFieldPatterns('en');
    expect(enUs).toBe(en);
  });
});
